-- Add a pre-invitation status "טרם הוזמן" (not_invited) and make it the default.
-- status is free TEXT (no CHECK constraint), so only the default changes here.
ALTER TABLE invitees ALTER COLUMN status SET DEFAULT 'not_invited';

-- Move the imported invitees that haven't actually been invited yet from the
-- old 'invited' default to 'not_invited'. Scoped to source='import' so it never
-- touches RSVP-driven rows or statuses an admin has already set. Runs once
-- (the migration runner records applied migrations).
UPDATE invitees SET status = 'not_invited', updated_at = now()
WHERE source = 'import' AND status = 'invited';
