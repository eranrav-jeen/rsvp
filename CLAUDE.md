# Project notes

## Deploying to the server

The production checkout lives at `/var/www/jeen-event` and tracks `main`.
After changes are merged to `main`, deploy with:

```bash
cd /var/www/jeen-event && ./deploy.sh
```

## Daily status digest (cron)

`backend/scripts/daily-digest.js` is run by the `ubuntu` user's crontab on the
server (not set up by `deploy.sh`). The server clock is UTC and Ubuntu's cron
ignores `CRON_TZ`, so UTC = Israel − 3h (valid while Israel is on UTC+3, i.e.
through the Oct 20 event).

**Final push (Oct 18–19):** the digest now focuses on attendance validation
(אישורי הגעה) and goes out **three times a day — 08:00, 13:00, 19:00 Israel**
(= 05:00, 10:00, 16:00 UTC). `shouldSend()` only sends on **Sun 18 & Mon 19 Oct
2026**; on every other day the run is a no-op, so the single cron line can fire
daily and still only send on those two days:

```
0 5,10,16 * * * cd /var/www/jeen-event/backend && /usr/bin/node scripts/daily-digest.js >> /home/ubuntu/jeen-digest.log 2>&1
```

The script decides by itself whether today is a send day. Test with
`node scripts/daily-digest.js --force --to=<addr>`; sends are logged in the
`email_log` table (`kind = 'daily_digest'`).

## Attendance-validation import (voice agent call results)

"ייבוא אקסל אימות הגעה" under the אימות הגעה widget → `POST
/api/invitees/validation-import` (`backend/src/routes/invitees.js`). Reads the
voice agent's xlsx (first sheet): **column B = phone, column C = status**. Maps
status מגיע/ה→confirmed, לא מגיע/ה→declined, אולי→unsure, טרם ענה/תה→no_answer,
matches invitees by phone (last 9 digits) and sets `validation_status` +
`validation_source='phone'`. It does **not** change registration status.
"ייבוא אקסל אישורי הזמנה קוליים" is a placeholder (disabled) for now.

## Agenda

The schedule lives in `frontend/src/agenda.json` — the public `/agenda` page and
the reminder email (`backend/src/agenda.js`) both read it. Edit it there.

## One-week reminder email

`backend/scripts/send-reminder.js` emails confirmed participants (not speakers;
Jeen staff included) asking yes / unsure / no. Each button links to a signed personal
page (`/reply/<token>`, `backend/src/routes/reply.js`); the answer is recorded
only on the page's confirm button (mail scanners pre-open links). Answers go to
`validation_status` with `validation_source = 'email'`; "no" also sets status
`declined` and emails the team. Usage: `--dry-run`, `--to=<addr>` (test copy),
no flag = send to everyone not yet sent (`reminder_sent_at` is null).

`--audience=last-call` sends a "last call" invitation instead, to people invited
but not registered (status `invited` / `no_response`) or who answered `maybe`:
one button to the registration form (normal approval flow), plus the agenda.
Tracked by `last_call_sent_at`. Both emails phrase the timing relative to the
send day ("בעוד 5 ימים", "מחר", …).

`--audience=arrival` sends the arrival instructions (bring ID for the QR
elevator ticket, address/floor, paid guest parking + Waze, light rail / train /
shuttles / buses + Google Maps transit link) to `confirmed` + `speaker`
participants who didn't cancel on a validation call, excluding Jeen staff.
Tracked by `arrival_sent_at` (migration 016).

## Cue cards (admin "כרטיסיות הנחיה")

`/admin/cue-cards` — stage cue cards for the event MC (`deck = 'mc'`) and the
panel host (`'panel'`), stored in `cue_cards` (seeded by migration 013) and
edited in the UI. Text markup: `**bold**`, lines starting with `- ` are bullets,
`___` is a blank. Printing the page gives one A5-landscape card per sheet.

## Attendance-validation call list export

"ייצוא לאימות הגעה" on the invitees page → `GET /api/invitees/validation-export`:
confirmed invitees with a phone whose `validation_status` isn't confirmed /
declined / wrong_number, excluding Jeen staff. Built from the team's template in
`backend/templates/call-list/` (sheet "מוזמנים", שם | טלפון) by
`backend/src/callListXlsx.js`; only the sheet rows are generated. Both call
lists export first names only (leading titles like ד״ר / פרופ׳ are skipped).

"הזמנה קולית למיטאפ" (`GET /api/invitees/voice-invite-export`) uses the same
template for invitees who haven't responded (status `invited` / `no_response`)
and have a phone, excluding Jeen staff, with two extra columns: תפקיד | ארגון.

"ייבוא אקסל אישורי הזמנה קוליים" (`POST /api/invitees/voice-invite-import`) reads
the voice agent's results for those calls in the same format as the validation
import (col B phone, col C status). Only invitees still invited / no_response /
maybe / not_invited change: מעוניין/ת (or מגיע/ה) → `pending` (ממתין לאישור),
לא מעוניין/ת (or לא מגיע/ה) → `declined`, אולי → `maybe`, טרם ענה/תה → unchanged;
all matched get `agenda_call`. (The voice-invite results file says
מעוניין/ת / לא מעוניין/ת; both imports accept either wording.)

## Task reminder emails

"📧 שליחת משימות במייל" on the tasks page (preview → confirm) → `GET/POST
/api/tasks/reminders`, or `node scripts/send-task-reminders.js [--dry-run |
--to=<addr>]`. Each team member gets one email with their open / in-progress
tasks; owners are free text, matched to people in `backend/src/team.js` (a task
with several owners goes to each). Missing emails: add them in `team.js` or via
`TEAM_EMAILS="name=email;…"` in `backend/.env`. "לשיבוץ" tasks are not sent.

## Door check-in (event day)

Each invitee row has a "כניסה" button in the פעולות column that toggles
`arrived_at` (migration 017) via `PATCH /api/invitees/:id` with `{arrived}`.
When checked in it shows a "+N מלווים" input bound to `arrived_guests`
(migration 018) — the companions who actually came (defaults to the registered
`plus_ones`; summary falls back to `plus_ones` when unset). The green
"נכנסו לאירוע" tile shows `arrived_total` (named participants + companions who
entered), with `arrived` and `arrived_guests` in the sub-label.

Milestone emails: when the live entered count (`arrived_total`) crosses
**75 / 95 / 105 / 115 / 125**, the organizing team (`teamRecipients()`) gets a
one-time email (`arrivalAlert()`, kind `arrival_alert`). `checkArrivalThresholds()`
runs after every check-in change (PATCH `{arrived|arrived_guests}`) and walk-in
create; the `arrival_alerts` table (migration 019) makes each threshold send
exactly once, ever — it does not re-fire if the count dips and rises again.

A "🚪 מצב כניסה" toggle (persisted in `localStorage` as `jeen_door_mode`) hides
every dashboard and most management chrome — leaving a big "נכנסו לאירוע" hero
number, the search + status filter, the "+ משתתף/ת חדש/ה" button, and a slimmed
table (ארגון · שם · תפקיד · טלפון · כניסה only). "↩ חזרה ללוח המלא" restores the
full view. Adding an invitee in door mode is a walk-in: the modal defaults to
`confirmed` and posts `arrived:true` (POST `/api/invitees` sets `arrived_at`),
so they count immediately.

## Post-event feedback survey

Questions live in `frontend/src/feedbackSurvey.json` (shared with the backend via
`backend/src/feedbackSurvey.js`). `node scripts/send-reminder.js
--audience=feedback [--dry-run | --to=<addr>]` emails a thank-you + personal link
(`/feedback/<token>`, signed with `makeScopedToken('feedback', id)`) to everyone
checked in at the door (`arrived_at`), excluding Jeen staff; tracked by
`post_survey_sent_at`. Answers: `post_survey_responses` (one per invitee,
re-submitting updates). Results: admin "תוצאות הסקר" → "סקר משוב אחרי הכנס" tab,
export `GET /api/invitees/post-survey-export`.
