-- Second outreach wave: sending the agenda. Tracked per channel, mirroring the
-- Save-the-Date wave (outreach_email/whatsapp/call).
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS agenda_email    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS agenda_whatsapp BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS agenda_call     BOOLEAN NOT NULL DEFAULT false;
