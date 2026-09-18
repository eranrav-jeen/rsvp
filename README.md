# Jeen.AI Event Platform — "ככה עושים AI בממשלה"

Internal admin tool + a public-facing RSVP form for the Jeen.AI government meetup
(Tue, 20.10.2026, 09:00–13:00, JeenAI offices, Begin 121, Azrieli Sarona, floor 34, Tel Aviv).

Built per [the build spec](./jeen-ai-event-platform-spec.md): Vite + React (RTL,
Hebrew-first) frontend, Node.js + Express REST API, PostgreSQL, served behind
nginx with pm2.

## Repo layout

```
backend/          Express API + Postgres (migrations, seed, routes)
  migrations/     SQL schema (001_init.sql)
  seed/           invitees.json + tasks.json (from the attached xlsx) + seed.js
  src/routes/     rsvp, invitees, tasks, marketing, eventSettings, auth
frontend/         Vite + React app (public RSVP + admin panel)
ecosystem.config.js   pm2 process definition
deploy.sh         git pull -> install -> migrate -> seed -> build -> pm2 restart
nginx.conf.example    reverse-proxy config (/api -> Node, / -> dist, SPA fallback)
```

## Features

- **Public RSVP form** (`/rsvp`, no auth) — Hebrew/RTL, mobile-first, branded to
  match the invitation. Enforces the 120-attendee cap (configurable): when full,
  new "yes" answers go to `waitlist` automatically. Capacity is computed inside a
  transaction with a row lock so two simultaneous submissions can't both exceed
  the cap. Confirmation screen reflects the real outcome (confirmed / waitlist /
  declined) and shows an add-to-calendar link only when confirmed.
- **Admin — Invitees** (`/admin/invitees`) — table with filter-by-status,
  search, inline status/plus-ones/notes editing, summary counters (incl. expected
  attendees vs. the cap), manual add, CSV/XLSX import (forward-fills organization,
  flags rows with a name-but-no-email), and XLSX export. Manually moving someone
  to `confirmed` re-runs the capacity check and warns/blocks (with an override) if
  it would exceed the cap.
- **Admin — Tasks** (`/admin/tasks`) — kanban (open / in progress / done) and a
  table view, grouped by owner, add/edit/delete, overdue flagging. Seeded from the
  tasks xlsx.
- **Admin — Marketing** (`/admin/marketing`) — image uploads (poster/social) with
  titles, plus editable email/WhatsApp text templates with copy-to-clipboard and
  multiple versions per type.
- **Admin auth** — a single shared admin password (spec §8), session cookie
  stored in Postgres. Everything under `/admin/*` and the admin API is gated;
  `/rsvp` and `POST /api/rsvp` stay public.

## Local development

Prerequisites: Node 18+ and PostgreSQL.

```bash
# 1. Create a database + role
createdb jeen_event   # or: psql -c "CREATE DATABASE jeen_event;"

# 2. Backend
cd backend
cp .env.example .env          # then edit DATABASE_URL / SESSION_SECRET / ADMIN_PASSWORD
npm install
npm run setup                 # runs migrations, then seeds invitees/tasks/templates
npm run dev                   # API on http://localhost:3001

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev                   # app on http://localhost:5173 (proxies /api to :3001)
```

Then open http://localhost:5173/rsvp (public) or http://localhost:5173/admin/login
(use the `ADMIN_PASSWORD` you set in `backend/.env`).

## Environment variables (`backend/.env`)

| var | purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `PORT` | API port (default 3001) |
| `SESSION_SECRET` | signs the session cookie — use a long random string |
| `ADMIN_PASSWORD` | the shared admin login password |
| `NODE_ENV` | `production` on the server (marks the cookie Secure) |
| `UPLOAD_DIR` | optional — where marketing images are stored (default `backend/uploads`) |
| `SERVE_FRONTEND` | set to `1` to have Express serve `frontend/dist` itself (otherwise nginx does) |

## Data model

See [`backend/migrations/001_init.sql`](./backend/migrations/001_init.sql):
`invitees`, `rsvp_submissions` (audit trail), `event_settings` (the cap),
`tasks`, `marketing_assets`, `admins` (reserved for future per-user accounts),
and the `session` store.

## Seed data

`npm run seed` loads the attached lists:

- **83 invitees** from the distribution xlsx. Organizations are forward-filled
  down blank rows; the ~10 rows that carried a name instead of an email import
  with a blank email and a Hebrew "please fill in an email" note (spec §10).
- **14 tasks** from the tasks xlsx, with Hebrew statuses mapped to
  open/in_progress/done and due dates parsed where possible (the original text is
  kept in `due_date_text`).
- **3 starter marketing templates** (first-send email, reminder email, short
  WhatsApp).

Seeding is skipped if a table already has rows; re-seed a clean copy with
`npm run seed -- --force`.

## API surface

```
POST   /api/rsvp                    (public) submit RSVP
POST   /api/auth/login              (public) admin login
POST   /api/auth/logout             (admin)
GET    /api/auth/me                 is the current session an admin?

GET    /api/invitees                (admin)  list + filter + search + summary
POST   /api/invitees                (admin)  create
PATCH  /api/invitees/:id            (admin)  update status/notes (capacity-checked)
POST   /api/invitees/import         (admin)  bulk import CSV/XLSX
GET    /api/invitees/export         (admin)  download XLSX
GET    /api/event-settings          (admin)  max_attendees + confirmed count
PATCH  /api/event-settings          (admin)  update max_attendees

GET    /api/tasks                   (admin)
POST   /api/tasks                   (admin)
PATCH  /api/tasks/:id               (admin)
DELETE /api/tasks/:id               (admin)

GET    /api/marketing               (admin)
POST   /api/marketing               (admin)  create/upload
DELETE /api/marketing/:id           (admin)
```

## Deployment (Oracle server)

1. Clone the repo (e.g. to `/var/www/jeen-event`).
2. `cp backend/.env.example backend/.env` and fill in real values.
3. Point Postgres `DATABASE_URL` at the server DB.
4. Copy `nginx.conf.example` to `/etc/nginx/sites-available/jeen-event`, adjust
   `server_name`, cert paths and `root`, enable it, `nginx -t && systemctl reload nginx`.
5. Run `./deploy.sh` — it pulls, installs, migrates, seeds, builds the frontend
   and (re)starts the pm2 app.

`deploy.sh` is safe to re-run: migrations use `IF NOT EXISTS` and seeding skips
non-empty tables.

## Notes / open items (from spec §10)

- Waitlist promotion is a **manual** admin action (move status to `confirmed`);
  no automatic emails are sent.
- The platform produces the invitation content and the export list; actual
  email/WhatsApp sending stays a manual step through existing tools.
- The brand palette was read off the invitation flyer by eye — swap in exact
  values from a Jeen.AI brand kit when available (`frontend/src/styles.css`,
  `:root`).
