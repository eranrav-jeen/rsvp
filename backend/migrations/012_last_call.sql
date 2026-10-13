-- "Last call" invitation to people who were invited but haven't registered
-- (invited / no_response / maybe). Tracks who already got it so re-runs skip them.
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS last_call_sent_at TIMESTAMPTZ;
