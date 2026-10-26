-- Anonymous community responses to the post-event survey, collected via a
-- generic public link (/feedback/community) — not tied to an invitee. Each
-- submission is its own row. Optional contact details for follow-up.
CREATE TABLE IF NOT EXISTS community_survey_responses (
  id SERIAL PRIMARY KEY,
  name         TEXT,
  organization TEXT,
  email        TEXT,
  answers      JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
