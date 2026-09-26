-- Stores a snapshot of the registration stats each time a daily digest is sent,
-- so the next digest can highlight what changed since the last one.
CREATE TABLE IF NOT EXISTS digest_snapshots (
  id SERIAL PRIMARY KEY,
  stats JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digest_snapshots_created ON digest_snapshots (created_at);
