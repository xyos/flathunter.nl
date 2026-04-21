import { Pool, PoolClient, QueryResultRow, types } from "pg";
import type { Favorite, GeoCache } from "./types";

// Return BIGINT (pg oid 20) as JS number instead of string. All flathunter IDs
// are well under Number.MAX_SAFE_INTEGER so we accept the tradeoff.
types.setTypeParser(20, (value) => parseInt(value, 10));

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Copy frontend/.env.example to frontend/.env.local."
      );
    }
    _pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return _pool;
}

async function query<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client?: PoolClient
): Promise<T[]> {
  const executor = client ?? getPool();
  const res = await executor.query<T>(sql, params);
  return res.rows;
}

export interface RawExpose {
  id: number;
  created: string;
  crawler: string;
  // jsonb is returned as a parsed object by node-postgres, so callers can read
  // fields directly without JSON.parse.
  details: Record<string, unknown>;
}

export async function getAllExposes(): Promise<RawExpose[]> {
  return query<RawExpose>(
    "SELECT id, created, crawler, details FROM exposes ORDER BY created DESC"
  );
}

export async function getExposeById(
  id: number,
  crawler: string
): Promise<RawExpose | null> {
  const rows = await query<RawExpose>(
    "SELECT id, created, crawler, details FROM exposes WHERE id = $1 AND crawler = $2",
    [id, crawler]
  );
  return rows[0] ?? null;
}

export async function getAllFavorites(): Promise<Favorite[]> {
  return query<Favorite>(
    "SELECT expose_id, crawler, rating, status, notes, created_at, updated_at FROM favorites ORDER BY updated_at DESC"
  );
}

export async function getFavorite(
  exposeId: number,
  crawler: string
): Promise<Favorite | null> {
  const rows = await query<Favorite>(
    "SELECT expose_id, crawler, rating, status, notes, created_at, updated_at FROM favorites WHERE expose_id = $1 AND crawler = $2",
    [exposeId, crawler]
  );
  return rows[0] ?? null;
}

export async function insertFavorite(
  exposeId: number,
  crawler: string
): Promise<void> {
  await query(
    `INSERT INTO favorites (expose_id, crawler, status)
     VALUES ($1, $2, 'new')
     ON CONFLICT (expose_id, crawler) DO NOTHING`,
    [exposeId, crawler]
  );
}

export async function updateFavorite(
  exposeId: number,
  crawler: string,
  patch: { rating?: number; status?: string; notes?: string }
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (patch.rating !== undefined) {
    sets.push(`rating = $${i++}`);
    values.push(patch.rating);
  }
  if (patch.status !== undefined) {
    sets.push(`status = $${i++}`);
    values.push(patch.status);
  }
  if (patch.notes !== undefined) {
    sets.push(`notes = $${i++}`);
    values.push(patch.notes);
  }
  if (sets.length === 0) return;

  sets.push(`updated_at = NOW()`);
  values.push(exposeId, crawler);

  await query(
    `UPDATE favorites SET ${sets.join(", ")} WHERE expose_id = $${i++} AND crawler = $${i}`,
    values
  );
}

export async function deleteFavorite(
  exposeId: number,
  crawler: string
): Promise<void> {
  await query(
    "DELETE FROM favorites WHERE expose_id = $1 AND crawler = $2",
    [exposeId, crawler]
  );
}

export async function getGeocacheFor(addresses: string[]): Promise<GeoCache[]> {
  if (addresses.length === 0) return [];
  return query<GeoCache>(
    "SELECT address, lat, lng FROM geocache WHERE address = ANY($1::text[])",
    [addresses]
  );
}

export async function upsertGeocache(
  address: string,
  lat: number,
  lng: number
): Promise<void> {
  await query(
    `INSERT INTO geocache (address, lat, lng) VALUES ($1, $2, $3)
     ON CONFLICT (address) DO NOTHING`,
    [address, lat, lng]
  );
}
