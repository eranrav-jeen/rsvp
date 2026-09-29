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
