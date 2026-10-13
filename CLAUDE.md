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
ignores `CRON_TZ`, so 05:00 UTC = 08:00 Israel time (valid while Israel is on
UTC+3, i.e. through the Oct 20 event):

```
0 5 * * * cd /var/www/jeen-event/backend && /usr/bin/node scripts/daily-digest.js >> /home/ubuntu/jeen-digest.log 2>&1
```

The script decides by itself whether today is a send day. Test with
`node scripts/daily-digest.js --force --to=<addr>`; sends are logged in the
`email_log` table (`kind = 'daily_digest'`).

## Agenda

The schedule lives in `frontend/src/agenda.json` — the public `/agenda` page and
the reminder email (`backend/src/agenda.js`) both read it. Edit it there.

## One-week reminder email

`backend/scripts/send-reminder.js` emails confirmed participants (not speakers,
not Jeen staff) asking yes / unsure / no. Each button links to a signed personal
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
