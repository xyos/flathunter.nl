"""Postgres implementation of the IdMaintainer interface.

Public method surface must match flathunter.idmaintainer.IdMaintainer so
WebHunter and Hunter can use either backend interchangeably.
"""
import datetime
import json
from typing import Any, Optional

import psycopg
from psycopg.types.json import Json

from flathunter.logging import logger


_SCHEMA = """
CREATE TABLE IF NOT EXISTS processed (id BIGINT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS executions (timestamp TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS exposes (
    id BIGINT NOT NULL,
    created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    crawler TEXT NOT NULL,
    details JSONB NOT NULL,
    PRIMARY KEY (id, crawler)
);
CREATE INDEX IF NOT EXISTS exposes_created_idx ON exposes(created DESC);
CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY, settings JSONB);
CREATE TABLE IF NOT EXISTS favorites (
    expose_id BIGINT NOT NULL,
    crawler TEXT NOT NULL,
    rating INT,
    status TEXT DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (expose_id, crawler)
);
CREATE TABLE IF NOT EXISTS geocache (
    address TEXT PRIMARY KEY,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""


class PostgresIdMaintainer:
    """Postgres back-end for the flathunter DB."""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self._conn: Optional[psycopg.Connection] = None
        self._ensure_schema()

    def _connection(self) -> psycopg.Connection:
        if self._conn is None or self._conn.closed:
            try:
                self._conn = psycopg.connect(self.database_url, autocommit=False)
            except psycopg.Error as error:
                logger.error("Postgres connect error: %s", error)
                raise
        return self._conn

    def _ensure_schema(self) -> None:
        with self._connection().cursor() as cur:
            cur.execute(_SCHEMA)
        self._connection().commit()

    def is_processed(self, expose_id: int) -> bool:
        logger.debug("is_processed(%d)", expose_id)
        with self._connection().cursor() as cur:
            cur.execute("SELECT 1 FROM processed WHERE id = %s", (expose_id,))
            return cur.fetchone() is not None

    def mark_processed(self, expose_id: int) -> None:
        logger.debug("mark_processed(%d)", expose_id)
        with self._connection().cursor() as cur:
            cur.execute(
                "INSERT INTO processed (id) VALUES (%s) ON CONFLICT (id) DO NOTHING",
                (expose_id,),
            )
        self._connection().commit()

    def save_expose(self, expose: dict) -> None:
        with self._connection().cursor() as cur:
            cur.execute(
                """
                INSERT INTO exposes (id, created, crawler, details)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id, crawler) DO UPDATE
                  SET created = EXCLUDED.created,
                      details = EXCLUDED.details
                """,
                (
                    int(expose["id"]),
                    datetime.datetime.now(tz=datetime.timezone.utc),
                    expose["crawler"],
                    Json(expose),
                ),
            )
        self._connection().commit()

    def get_exposes_since(self, min_datetime: datetime.datetime) -> list[dict]:
        with self._connection().cursor() as cur:
            cur.execute(
                """
                SELECT created, crawler, details
                FROM exposes
                WHERE created >= %s
                ORDER BY created DESC
                """,
                (min_datetime,),
            )
            rows = cur.fetchall()
        result = []
        for created, _, details in rows:
            obj = details if isinstance(details, dict) else json.loads(details)
            obj["created_at"] = created
            result.append(obj)
        return result

    def get_recent_exposes(self, count: int, filter_set: Any = None) -> list[dict]:
        with self._connection().cursor(name="recent_exposes") as cur:
            cur.itersize = 200
            cur.execute("SELECT details FROM exposes ORDER BY created DESC")
            res: list[dict] = []
            for (details,) in cur:
                if len(res) >= count:
                    break
                expose = details if isinstance(details, dict) else json.loads(details)
                if filter_set is None or filter_set.is_interesting_expose(expose):
                    res.append(expose)
        return res

    def save_settings_for_user(self, user_id: int, settings: dict) -> None:
        with self._connection().cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (id, settings) VALUES (%s, %s)
                ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings
                """,
                (user_id, Json(settings)),
            )
        self._connection().commit()

    def get_settings_for_user(self, user_id: int) -> Optional[dict]:
        with self._connection().cursor() as cur:
            cur.execute("SELECT settings FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
        if row is None:
            return None
        settings = row[0]
        return settings if isinstance(settings, dict) else json.loads(settings)

    def get_user_settings(self) -> list[tuple[int, dict]]:
        with self._connection().cursor() as cur:
            cur.execute("SELECT id, settings FROM users")
            rows = cur.fetchall()
        return [
            (uid, s if isinstance(s, dict) else json.loads(s))
            for uid, s in rows
        ]

    def get_last_run_time(self) -> Optional[datetime.datetime]:
        with self._connection().cursor() as cur:
            cur.execute(
                "SELECT timestamp FROM executions ORDER BY timestamp DESC LIMIT 1"
            )
            row = cur.fetchone()
        return row[0] if row else None

    def update_last_run_time(self) -> datetime.datetime:
        result = datetime.datetime.now(tz=datetime.timezone.utc)
        with self._connection().cursor() as cur:
            cur.execute("INSERT INTO executions (timestamp) VALUES (%s)", (result,))
        self._connection().commit()
        return result
