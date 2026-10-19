-- Door check-in: when a participant physically enters the venue.
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
