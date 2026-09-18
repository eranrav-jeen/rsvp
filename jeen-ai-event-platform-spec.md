# Jeen.AI Event Platform — Build Spec

## 1. Context

Internal tool to run **"ככה עושים AI בממשלה"** — a Jeen.AI meetup for government
organizations.

- **Date:** Tue, 20.10.2026, 09:00–13:00
- **Location:** JeenAI offices, Begin 121, Azrieli Sarona Towers, floor 34, Tel Aviv
- **Audience:** ~80 government ministries/agencies (see invitee list), by personal
  invitation only, capacity-limited
- **Agenda:** opening with Jeen, 3 orgs share AI questions the community can answer,
  client success stories, a panel on AI adoption in government, summary

This is an **internal admin tool + one public-facing RSVP form**, not a consumer
product. Optimize for "gets built and works this week," not for scale.

## 2. Users

1. **Organizers** (Miטal, Matan, Eran, Dan, Li, Oded, Eyal — the people in the task
   list) — need a login-gated admin area.
2. **Invitees** — no login. They reach a public RSVP link (emailed/WhatsApped to
   them) and fill a short form.

## 3. Tech stack (fixed — use what's already on the server)

- **Frontend:** Vite + React (RTL, Hebrew-first UI, mobile-friendly for the public
  RSVP form)
- **Backend:** Node.js + Express REST API
- **DB:** PostgreSQL
- **Process manager:** pm2 (one ecosystem.config.js running the API; the built
  Vite frontend is served as static files, either by Express or directly by nginx)
- **Reverse proxy:** nginx (TLS termination + routing to the pm2 app; serves
  `/` → frontend static build, `/api` → Node app)
- **Source control / deploy:** GitHub repo, deploy via `git pull` + `npm run build`
  + `pm2 restart` on the Oracle server (a simple `deploy.sh` script is enough —
  no need for GitHub Actions unless it's trivial to add)
- **File storage for marketing images:** local disk on the Oracle server under
  e.g. `/var/www/jeen-event/uploads`, served statically via nginx/Express.
  (No S3 — keep infra minimal.)
- **Auth for admin area:** simple — single shared admin password or a small
  `admins` table with hashed passwords + session cookie (express-session +
  connect-pg-simple, or a signed JWT in an httpOnly cookie). No need for OAuth.

## 4. Data model (Postgres)

```sql
-- Invitees / RSVP tracking (seeded from the attached xlsx)
CREATE TABLE invitees (
  id SERIAL PRIMARY KEY,
  organization TEXT NOT NULL,       -- "משרד האוצר"
  full_name TEXT,
  role TEXT,                        -- תפקיד — job title/role at the organization
  email TEXT,                       -- nullable: some rows only have a name
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'invited',
    -- invited | confirmed | declined | waitlist | no_response
  plus_ones INTEGER DEFAULT 0,
  notes TEXT,
  source TEXT DEFAULT 'import',     -- import | rsvp_form | manual
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- One row per RSVP form submission (kept even if it updates an existing invitee,
-- for an audit trail)
CREATE TABLE rsvp_submissions (
  id SERIAL PRIMARY KEY,
  invitee_id INTEGER REFERENCES invitees(id),
  full_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  role TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  attending BOOLEAN NOT NULL,
  plus_ones INTEGER DEFAULT 0,
  dietary_notes TEXT,
  comments TEXT,
  resulting_status TEXT,             -- confirmed | waitlist | declined — what it resolved to
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Single-row config table for event-wide settings
CREATE TABLE event_settings (
  id SERIAL PRIMARY KEY,
  max_attendees INTEGER NOT NULL DEFAULT 120,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO event_settings (max_attendees) VALUES (120);

-- Action items (seeded from Tasks_list.md)
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  owner TEXT NOT NULL,              -- אחראי/ת — free text, may be multiple names
  title TEXT NOT NULL,              -- משימה
  status TEXT NOT NULL DEFAULT 'open', -- open | in_progress | done
  due_date DATE,                    -- מועד לביצוע (store as text if not a clean date)
  due_date_text TEXT,               -- fallback for values like "עבור הכנס 20.10"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Marketing materials
CREATE TABLE marketing_assets (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,               -- image | email_text | whatsapp_text | other
  title TEXT NOT NULL,
  file_path TEXT,                   -- for images/files
  body TEXT,                        -- for text templates
  language TEXT DEFAULT 'he',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 5. Features

### 5.1 Public RSVP form (`/rsvp`, no auth)
- Fields: full name, organization, role/title, email, phone, attending (yes/no),
  plus-ones, dietary notes, free-text comment.
- Hebrew, RTL, mobile-first, single page.
- **Capacity logic (cap = 120, configurable via `event_settings.max_attendees`):**
  1. On submit, compute `current_confirmed = SUM(plus_ones + 1)` over all
     `invitees` where `status = 'confirmed'` (do this inside a transaction /
     with a row lock to avoid a race when two people submit at once).
  2. If `attending = false` → status is simply `declined`, no capacity check.
  3. If `attending = true`:
     - If `current_confirmed + (1 + plus_ones) <= max_attendees` → status =
       `confirmed`.
     - Otherwise → status = `waitlist`.
  4. Insert a row into `rsvp_submissions` with `resulting_status` set to
     whatever was decided.
  5. Match an existing `invitees` row by email (case-insensitive), else by
     organization if email is blank; update its `status` and `plus_ones`
     to the new values. If no match, create a new `invitees` row with
     `source = 'rsvp_form'`.
- Confirmation screen reflects the actual outcome: "you're confirmed" vs.
  "you're on the waitlist — we'll reach out if a spot opens" vs. "thanks for
  letting us know" (decline). Add-to-calendar link only shown on confirmation.
- If someone on the waitlist is later promoted (see 5.2), that's a manual
  admin action, not automatic — simplest to reason about and avoid surprise
  emails going out on their own.

### 5.2 Admin: Invitee list (`/admin/invitees`)
- Table view: organization, full name, role, email, phone, status, plus-ones,
  source.
- Filter by status (including `waitlist`), search by org/name/email/role.
- Inline status edit + notes — includes manually moving someone from
  `waitlist` to `confirmed` (e.g. after a cancellation), which should re-run
  the same capacity check so the admin gets a warning if it would push the
  count over 120.
- Manual "add invitee" and "import from CSV/XLSX" (reuse the attached list
  format: columns `משרד`, `כתובת מייל`, extended with name/role/phone where
  available).
- Export current list to CSV/XLSX (for sending the invitation email/WhatsApp
  blast through whatever tool they normally use).
- Summary counters at the top: invited / confirmed / declined / waitlist /
  no response / **total expected attendees vs. 120 cap** (confirmed +
  plus_ones), shown prominently so organizers see at a glance how close they
  are to full.

### 5.3 Admin: Marketing materials (`/admin/marketing`)
- Upload images (event poster, social assets) with a title/tag; list with
  thumbnail + download link.
- Text templates for invitation copy (email subject+body, WhatsApp message),
  stored as editable rich/plain text with a "copy to clipboard" button.
- Support multiple versions of the same asset type (e.g. "email — first send",
  "email — reminder", "WhatsApp — short").

### 5.4 Admin: Task board (`/admin/tasks`)
- Seed from `Tasks_list.md` (14 tasks, Hebrew, columns: אחראי/ת, משימה, סטטוס,
  מועד לביצוע).
- Table or simple kanban (open / in progress / done) grouped by owner or due date.
- Add/edit/delete tasks, mark status, set due date.
- Flag overdue open tasks (due_date < today) visually.

### 5.5 Admin auth
- Login page, shared credentials or per-organizer accounts (your call — start
  with one shared admin login if that's faster to ship).
- Everything under `/admin/*` requires a valid session; `/rsvp` and its API
  endpoint stay public.

## 6. API surface (suggested)

```
POST   /api/rsvp                    (public) submit RSVP
GET    /api/invitees                (admin)  list + filter
POST   /api/invitees                (admin)  create
PATCH  /api/invitees/:id            (admin)  update status/notes
POST   /api/invitees/import         (admin)  bulk import from CSV/XLSX
GET    /api/invitees/export         (admin)  download CSV/XLSX
GET    /api/event-settings          (admin)  get max_attendees + current counts
PATCH  /api/event-settings          (admin)  update max_attendees

GET    /api/tasks                   (admin)
POST   /api/tasks                   (admin)
PATCH  /api/tasks/:id                (admin)
DELETE /api/tasks/:id               (admin)

GET    /api/marketing               (admin)
POST   /api/marketing               (admin)  create/upload
DELETE /api/marketing/:id           (admin)

POST   /api/auth/login              (public) admin login
POST   /api/auth/logout             (admin)
```

## 7. Deployment on the existing Oracle server

- Repo layout: `/frontend` (Vite/React) and `/backend` (Express) in one GitHub
  repo, or two repos — either is fine, pick one and stay consistent.
- `pm2` runs the backend (`pm2 start ecosystem.config.js`); frontend is built
  with `npm run build` and served as static files.
- nginx config: reverse-proxy `/api` to the pm2-managed Node port (e.g. 3001),
  serve the built frontend `dist/` for everything else, with a fallback to
  `index.html` for client-side routing.
- `.env` on the server (not committed) holds: `DATABASE_URL`, `SESSION_SECRET`,
  `PORT`.
- Simple deploy flow: `git pull` → `npm ci && npm run build` (frontend) →
  `pm2 restart jeen-event-api` — wrap this in a `deploy.sh` script in the repo.
- Run the `CREATE TABLE` statements above as a migration on first deploy, then
  seed `invitees` from the attached xlsx and `tasks` from `Tasks_list.md`.

## 8. Decisions locked in

- **Admin auth:** one shared admin password (no per-user accounts for v1).
- **Invitee fields:** name, organization, role/title, email, phone number (all
  captured on the RSVP form and editable in the admin table).
- **Capacity:** hard cap of **120** confirmed attendees (counting plus-ones).
  Once reached, new "yes" RSVPs go to `waitlist` instead of `confirmed`
  automatically (see §5.1). Cap is stored in `event_settings` so it can be
  changed from the admin panel without a code change.

## 9. Design / branding

Public-facing pages — the RSVP form and its confirmation screen — should read
as an extension of the printed invitation, not a generic form. The admin panel
can stay plain/utilitarian; branding matters most where invitees see it.

Palette read from the invitation flyer (swatches in its footer), as CSS
variables:

```css
:root {
  --color-coral: #EF5B2B;      /* primary accent — headlines, buttons, CTAs */
  --color-amber: #F5A93C;      /* secondary accent — highlights, hover states */
  --color-pink: #F3C6DE;       /* soft background blocks, section backgrounds */
  --color-maroon: #3B0E2C;     /* dark headline text, high-contrast elements */
  --color-cream: #FBF3EA;      /* page background */
  --color-text: #221018;       /* body text, near-black with a warm tint */
}
```

Notes for Claude Code:
- These are read off the flyer by eye — treat them as a starting point and
  nudge them to match exactly once the real brand/design files are available
  (ask if Jeen.AI has a brand kit rather than re-deriving from the JPG).
- Typography on the flyer is a bold, rounded/geometric sans for headlines —
  approximate with a similar system/Google font (e.g. Rubik or Assistant,
  which both support Hebrew well) rather than trying to match it exactly.
- RSVP form: cream background, coral for the primary "Submit"/attending
  buttons, maroon for headings, pink as a soft card/section background —
  mirrors the flyer's own block layout.
- Keep it simple: a handful of CSS variables + one accent color per
  interactive element is enough. Don't over-design a form people fill out once.

## 10. Still open

- Some rows in the source invitee list have a name instead of an email in the
  second column — these should import with a blank email and get flagged for
  the organizers to fill in (or handle differently if you'd rather).
- No automated email/WhatsApp sending from the platform itself — it produces
  the content and export list; sending stays a manual step through existing
  tools, unless you want that added.
- Whether waitlist promotion should trigger an actual notification (email) to
  the promoted invitee, or stay a silent status change the organizer follows
  up on manually — spec above assumes the latter (simpler, no email sending
  infra needed).
