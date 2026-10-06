-- Attendance-validation phone calls, placed by an external AI calling bot to the
-- confirmed participants. Tracked separately from the invite/agenda outreach
-- waves. validation_status is one of:
--   confirmed | declined | no_answer | callback | wrong_number  (null = not called)
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS validation_status    TEXT;
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS validation_called_at TIMESTAMPTZ;
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS validation_notes     TEXT;
