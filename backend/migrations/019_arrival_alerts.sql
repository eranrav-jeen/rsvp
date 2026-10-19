-- Milestone emails to the organizing team when the live door count crosses a
-- threshold (75/95/105/115/125). One row per threshold that has been alerted,
-- so each milestone emails exactly once ever.
CREATE TABLE IF NOT EXISTS arrival_alerts (
  threshold INTEGER PRIMARY KEY,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
