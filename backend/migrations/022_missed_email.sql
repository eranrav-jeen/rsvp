-- "What you missed" email to people who didn't attend (approved no-shows and
-- invitees who didn't come), with a link to the feedback survey.
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS missed_sent_at TIMESTAMPTZ;
