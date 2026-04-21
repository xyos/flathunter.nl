-- Flathunter shared schema. Applied once to Neon by hand (psql -f) or on first boot of PostgresIdMaintainer.
-- Kept small and idempotent so both the Python crawler and the Next.js frontend can CREATE IF NOT EXISTS on startup.

CREATE TABLE IF NOT EXISTS processed (
  id BIGINT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS executions (
  timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS exposes (
  id BIGINT NOT NULL,
  created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  crawler TEXT NOT NULL,
  details JSONB NOT NULL,
  PRIMARY KEY (id, crawler)
);

CREATE INDEX IF NOT EXISTS exposes_created_idx ON exposes(created DESC);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  settings JSONB
);

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
