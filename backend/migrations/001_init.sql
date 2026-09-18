-- Jeen.AI Event Platform — initial schema
-- Safe to run repeatedly (IF NOT EXISTS guards).

-- Invitees / RSVP tracking (seeded from the attached xlsx)
CREATE TABLE IF NOT EXISTS invitees (
  id SERIAL PRIMARY KEY,
  organization TEXT NOT NULL,       -- "משרד האוצר"
  full_name TEXT,
  role TEXT,                        -- תפקיד — job title/role at the organization
  email TEXT,                       -- nullable: some rows only have a name
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'invited',
    -- invited | confirmed | declined | waitlist | no_response
  plus_ones INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  source TEXT DEFAULT 'import',     -- import | rsvp_form | manual
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitees_status ON invitees (status);
CREATE INDEX IF NOT EXISTS idx_invitees_email_lower ON invitees (LOWER(email));

-- One row per RSVP form submission (kept even if it updates an existing invitee,
-- for an audit trail)
CREATE TABLE IF NOT EXISTS rsvp_submissions (
  id SERIAL PRIMARY KEY,
  invitee_id INTEGER REFERENCES invitees(id),
  full_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  role TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  attending BOOLEAN NOT NULL,
  plus_ones INTEGER NOT NULL DEFAULT 0,
  dietary_notes TEXT,
  comments TEXT,
  resulting_status TEXT,             -- confirmed | waitlist | declined
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Single-row config table for event-wide settings
CREATE TABLE IF NOT EXISTS event_settings (
  id SERIAL PRIMARY KEY,
  max_attendees INTEGER NOT NULL DEFAULT 120,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO event_settings (max_attendees)
  SELECT 120 WHERE NOT EXISTS (SELECT 1 FROM event_settings);

-- Action items (seeded from the tasks xlsx)
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  owner TEXT NOT NULL,              -- אחראי/ת — free text, may be multiple names
  title TEXT NOT NULL,              -- משימה
  status TEXT NOT NULL DEFAULT 'open', -- open | in_progress | done
  due_date DATE,                    -- מועד לביצוע (parsed date when possible)
  due_date_text TEXT,               -- fallback for values like "עבור הכנס 20.10"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Marketing materials
CREATE TABLE IF NOT EXISTS marketing_assets (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,               -- image | email_text | whatsapp_text | other
  title TEXT NOT NULL,
  file_path TEXT,                   -- for images/files
  body TEXT,                        -- for text templates
  language TEXT DEFAULT 'he',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users (kept for future per-user accounts; v1 uses a shared password)
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Session store for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
