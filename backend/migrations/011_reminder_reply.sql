-- One-week reminder email with a "will you attend?" question. Answers land in
-- the same validation_status the calling bot uses (plus the new 'unsure'), and
-- validation_source records where the answer came from ('email' | 'phone').
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS reminder_sent_at  TIMESTAMPTZ;
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS validation_source TEXT;
