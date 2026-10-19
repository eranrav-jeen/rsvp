-- Arrival-instructions email (ID for the QR elevator ticket, parking, transit),
-- sent the day before the event. Tracks who already got it.
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS arrival_sent_at TIMESTAMPTZ;
