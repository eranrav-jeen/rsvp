-- Application mechanism: when on, a "yes" RSVP becomes a pending application
-- that an admin must approve (→ confirmed) rather than auto-confirming.
ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT true;
