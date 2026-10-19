-- Door check-in: how many companions actually entered with the participant
-- (may differ from the registered plus_ones). NULL = not specified yet; then the
-- summary falls back to the registered plus_ones.
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS arrived_guests INTEGER;
