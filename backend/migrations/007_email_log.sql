-- Audit trail of outbound transactional emails (registration ack, approval,
-- decline). One row per send attempt, including skips and failures.
CREATE TABLE IF NOT EXISTS email_log (
  id SERIAL PRIMARY KEY,
  invitee_id INTEGER REFERENCES invitees(id),
  recipient TEXT NOT NULL,
  kind TEXT NOT NULL,               -- registration_pending | registration_confirmed | approved | declined | ...
  subject TEXT,
  status TEXT NOT NULL,             -- sent | skipped | failed
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_invitee ON email_log (invitee_id);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log (created_at);
