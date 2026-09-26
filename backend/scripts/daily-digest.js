// Daily registration-status digest to the organizing team.
//
// Scheduling: run this once every morning from cron; the script itself decides
// whether today is a send day, per these rules:
//   - 08:00 Israel time (cron fires it; see the crontab line in README/notes)
//   - NOT on Fridays or Saturdays
//   - up to and including Oct 4, 2026: only every other day (holiday period)
//   - Oct 5 – Oct 20, 2026: every working day (Sun–Thu)
//   - never after the event day (Oct 20, 2026)
//
// Run manually with `node scripts/daily-digest.js --force` to send regardless of
// the date rules (for testing). Add `--to=eran@jeen.ai` to send the test to a
// single address instead of the whole team.

import { pool, query } from '../src/db.js';
import { sendMail } from '../src/mailer.js';
import { dailyDigest } from '../src/emails.js';

// Recipients: --to=<addr[,addr]> overrides everything (handy for testing),
// then DIGEST_RECIPIENTS env, then the default organizing team.
const toArg = process.argv.find((a) => a.startsWith('--to='));
const RECIPIENTS =
  (toArg && toArg.slice('--to='.length)) ||
  process.env.DIGEST_RECIPIENTS ||
  'meital@jeen.ai, matan@jeen.ai, inbar@jeen.ai, eran@jeen.ai';

// Event day (Oct 20, 2026). The whole campaign window is within Israel Daylight
// Time (UTC+3), so a fixed +3h shift gives Israel wall-clock parts.
function israelParts(now = new Date()) {
  const shifted = new Date(now.getTime() + 3 * 3600 * 1000);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    dow: shifted.getUTCDay(), // 0=Sun … 6=Sat
  };
}

export function shouldSend(now = new Date()) {
  const { y, m, d, dow } = israelParts(now);
  if (y > 2026 || (y === 2026 && (m > 10 || (m === 10 && d > 20)))) {
    return { send: false, reason: 'after event day' };
  }
  if (dow === 5 || dow === 6) return { send: false, reason: 'weekend (Fri/Sat)' };
  const throughOct4 = m < 10 || (m === 10 && d <= 4);
  if (throughOct4) {
    const doy = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000);
    if (doy % 2 !== 0) return { send: false, reason: 'holiday cadence (every 2 days)' };
  }
  return { send: true, reason: 'send day' };
}

async function gatherStats() {
  const rows = (
    await query(
      `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(plus_ones + 1),0)::int AS seats
       FROM invitees GROUP BY status`
    )
  ).rows;
  const by = {};
  for (const r of rows) by[r.status] = r;
  const get = (k) => (by[k] ? by[k].count : 0);
  const settings = (await query('SELECT max_attendees FROM event_settings ORDER BY id LIMIT 1')).rows[0];
  const outreach = (
    await query(`SELECT COUNT(*) FILTER (WHERE outreach_email)::int AS email FROM invitees`)
  ).rows[0];
  const noEmail = (
    await query(`SELECT COUNT(*)::int AS n FROM invitees WHERE email IS NULL OR email = ''`)
  ).rows[0].n;
  return {
    total: rows.reduce((a, r) => a + r.count, 0),
    not_invited: get('not_invited'),
    invited: get('invited'),
    pending: get('pending'),
    confirmed: get('confirmed'),
    speaker: get('speaker'),
    maybe: get('maybe'),
    declined: get('declined'),
    waitlist: get('waitlist'),
    no_response: get('no_response'),
    confirmed_seats: (by.confirmed ? by.confirmed.seats : 0) + (by.speaker ? by.speaker.seats : 0),
    max_attendees: settings ? settings.max_attendees : 120,
    outreach_email: outreach.email,
    noEmail,
  };
}

function recommend(s) {
  const recs = [];
  if (s.pending > 0) recs.push(`יש ${s.pending} בקשות הממתינות לאישור — יש לאשר או לדחות אותן.`);
  if (s.not_invited > 0) recs.push(`${s.not_invited} מוזמנים טרם הוזמנו — כדאי לשלוח להם הזמנה.`);
  if (s.invited > 0) recs.push(`${s.invited} הוזמנו אך טרם נרשמו — כדאי תזכורת או פנייה נוספת.`);
  if (s.noEmail > 0) recs.push(`${s.noEmail} מוזמנים ללא כתובת מייל — כדאי להשלים פרטים.`);
  if (s.maybe > 0) recs.push(`${s.maybe} סימנו "אולי" — כדאי לחזור אליהם לתשובה סופית.`);
  const left = s.max_attendees - s.confirmed_seats;
  if (left > 0) recs.push(`נותרו ${left} מקומות פנויים מתוך ${s.max_attendees} (${s.confirmed_seats} מאושרים).`);
  else recs.push(`המכסה מלאה (${s.confirmed_seats}/${s.max_attendees}) — כדאי לנהל רשימת המתנה.`);
  return recs;
}

async function main() {
  const force = process.argv.includes('--force');
  const decision = shouldSend();
  if (!decision.send && !force) {
    console.log(`[digest] skip — ${decision.reason}`);
    await pool.end();
    return;
  }
  const s = await gatherStats();
  const { y, m, d } = israelParts();
  const dateLabel = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
  const daysToEvent = Math.max(0, Math.round((Date.UTC(2026, 9, 20) - Date.UTC(y, m - 1, d)) / 86400000));
  const msg = dailyDigest({ dateLabel, daysToEvent, stats: s, recommendations: recommend(s) });
  const res = await sendMail({
    to: RECIPIENTS,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    kind: msg.kind,
  });
  console.log(`[digest] ${decision.reason}${force ? ' (forced)' : ''} → ${JSON.stringify(res)}`);
  await pool.end();
}

// Only run when executed directly (not when imported for testing).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('[digest] error:', e);
    process.exit(1);
  });
}
