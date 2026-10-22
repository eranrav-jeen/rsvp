-- Post-event reflection ("סיכום ותחקיר" admin tab): one free-text note per
-- discussion topic, shared by the whole team. Topic keys are defined in the UI.
CREATE TABLE IF NOT EXISTS retro_notes (
  key TEXT PRIMARY KEY,
  body TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
