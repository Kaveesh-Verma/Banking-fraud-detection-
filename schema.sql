-- Run this once to set up your PostgreSQL database
-- Usage: psql -U youruser -d finshield -f schema.sql

CREATE DATABASE finshield;

\c finshield

CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  mobile          TEXT NOT NULL,
  login_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  os              TEXT NOT NULL DEFAULT 'Unknown',
  browser         TEXT NOT NULL DEFAULT 'Unknown',
  device_type     TEXT NOT NULL DEFAULT 'Unknown',
  user_agent      TEXT NOT NULL DEFAULT '',
  location_permission BOOLEAN NOT NULL DEFAULT false,
  latitude        REAL,
  longitude       REAL,
  city            TEXT,
  country         TEXT,
  ip              TEXT,
  mouse_movements INTEGER NOT NULL DEFAULT 0,
  clicks          INTEGER NOT NULL DEFAULT 0,
  key_presses     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: check contents
-- SELECT * FROM sessions ORDER BY created_at DESC;
