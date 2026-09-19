-- Who on the team is responsible for inviting this person (free text; chosen
-- from the same people combo used for tasks, or a custom name).
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS invited_by TEXT;
