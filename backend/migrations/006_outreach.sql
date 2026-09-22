-- Track which channels marketing used to reach each invitee.
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS outreach_email BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS outreach_whatsapp BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS outreach_call BOOLEAN NOT NULL DEFAULT false;
