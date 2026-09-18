-- RSVP form additions: a "maybe" attendance option and an opt-in survey.
-- attending stays for backward-compat; attendance carries yes/no/maybe.
ALTER TABLE rsvp_submissions ADD COLUMN IF NOT EXISTS attendance TEXT;
ALTER TABLE rsvp_submissions ADD COLUMN IF NOT EXISTS survey JSONB;
