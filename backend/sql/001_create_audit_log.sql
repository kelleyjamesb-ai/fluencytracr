-- Audit log table: append-only, hash-chained
-- Role and grant management is handled by bootstrap scripts, not migrations.
CREATE TABLE IF NOT EXISTS audit_log (
  id                  TEXT PRIMARY KEY,
  org_id              TEXT NOT NULL,
  action              TEXT NOT NULL,
  actor_sub           TEXT NOT NULL,
  actor_role          TEXT NOT NULL,
  metadata            JSONB NOT NULL DEFAULT '{}',
  entry_hash          TEXT NOT NULL,
  previous_entry_hash TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(org_id, entry_hash)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log (org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at);
