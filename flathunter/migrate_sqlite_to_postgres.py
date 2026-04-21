"""One-shot migration from the local SQLite processed_ids.db to Postgres.

Usage:
    pipenv run python -m flathunter.migrate_sqlite_to_postgres \
        --sqlite ./processed_ids.db --pg "$FLATHUNTER_DATABASE_URL"

Idempotent: every INSERT uses ON CONFLICT DO NOTHING so you can re-run safely
if a single table fails. Prints row counts before and after for verification.
"""
import argparse
import json
import sqlite3
import sys
from typing import Iterable

import psycopg
from psycopg.types.json import Json


def _sqlite_counts(sqlite_conn: sqlite3.Connection) -> dict[str, int]:
    cur = sqlite_conn.cursor()
    counts = {}
    for table in ("processed", "executions", "exposes", "users", "favorites", "geocache"):
        try:
            cur.execute(f"SELECT count(*) FROM {table}")
            counts[table] = cur.fetchone()[0]
        except sqlite3.Error:
            counts[table] = 0
    return counts


def _pg_counts(pg_conn: psycopg.Connection) -> dict[str, int]:
    counts = {}
    with pg_conn.cursor() as cur:
        for table in ("processed", "executions", "exposes", "users", "favorites", "geocache"):
            cur.execute(f"SELECT count(*) FROM {table}")
            counts[table] = cur.fetchone()[0]
    return counts


def _rows(sqlite_conn: sqlite3.Connection, sql: str) -> Iterable[tuple]:
    cur = sqlite_conn.cursor()
    cur.execute(sql)
    while True:
        batch = cur.fetchmany(500)
        if not batch:
            return
        yield from batch


def migrate(sqlite_path: str, pg_url: str) -> None:
    sqlite_conn = sqlite3.connect(f"file:{sqlite_path}?mode=ro", uri=True)
    pg_conn = psycopg.connect(pg_url, autocommit=False)

    before = _pg_counts(pg_conn)
    src = _sqlite_counts(sqlite_conn)
    print(f"SQLite source counts: {src}")
    print(f"Postgres before    : {before}")

    with pg_conn.cursor() as cur:
        # processed: simple id list
        for (expose_id,) in _rows(sqlite_conn, "SELECT id FROM processed"):
            cur.execute(
                "INSERT INTO processed (id) VALUES (%s) ON CONFLICT (id) DO NOTHING",
                (expose_id,),
            )

        # executions: plain timestamp
        for (ts,) in _rows(sqlite_conn, "SELECT timestamp FROM executions"):
            cur.execute("INSERT INTO executions (timestamp) VALUES (%s)", (ts,))

        # exposes: details is a JSON string in SQLite (BLOB), becomes JSONB
        for expose_id, created, crawler, details in _rows(
            sqlite_conn, "SELECT id, created, crawler, details FROM exposes"
        ):
            parsed = json.loads(details) if isinstance(details, (str, bytes)) else details
            cur.execute(
                """
                INSERT INTO exposes (id, created, crawler, details)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id, crawler) DO NOTHING
                """,
                (int(expose_id), created, crawler, Json(parsed)),
            )

        # users: settings is a JSON string
        for user_id, settings in _rows(sqlite_conn, "SELECT id, settings FROM users"):
            parsed_settings = json.loads(settings) if isinstance(settings, (str, bytes)) else settings
            cur.execute(
                """
                INSERT INTO users (id, settings) VALUES (%s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (user_id, Json(parsed_settings)),
            )

        # favorites (frontend-created table)
        for row in _rows(
            sqlite_conn,
            "SELECT expose_id, crawler, rating, status, notes, created_at, updated_at FROM favorites",
        ):
            cur.execute(
                """
                INSERT INTO favorites (expose_id, crawler, rating, status, notes, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (expose_id, crawler) DO NOTHING
                """,
                row,
            )

        # geocache (frontend-created table)
        for row in _rows(
            sqlite_conn, "SELECT address, lat, lng, created_at FROM geocache"
        ):
            cur.execute(
                """
                INSERT INTO geocache (address, lat, lng, created_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (address) DO NOTHING
                """,
                row,
            )

    pg_conn.commit()

    after = _pg_counts(pg_conn)
    print(f"Postgres after     : {after}")

    pg_conn.close()
    sqlite_conn.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sqlite", required=True, help="Path to processed_ids.db")
    parser.add_argument("--pg", required=True, help="Postgres connection string")
    args = parser.parse_args()
    migrate(args.sqlite, args.pg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
