-- Post-event feedback survey, sent to the people who attended (arrived_at set).
-- One response per invitee (re-submitting updates it). Questions live in
-- frontend/src/feedbackSurvey.json; answers are stored by question key.
CREATE TABLE IF NOT EXISTS post_survey_responses (
  id SERIAL PRIMARY KEY,
  invitee_id INT NOT NULL UNIQUE REFERENCES invitees(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE invitees ADD COLUMN IF NOT EXISTS post_survey_sent_at TIMESTAMPTZ;
