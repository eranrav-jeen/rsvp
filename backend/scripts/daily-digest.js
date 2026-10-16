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

// Final-push cadence: in the last days before the event the digest focuses on
// attendance validation (אישורי הגעה) and goes out three times a day (08:00,
// 13:00, 19:00 Israel — driven by cron) ONLY on Sun 18 & Mon 19 Oct 2026.
// Nothing before, and nothing on the event day itself (Tue 20).
export function shouldSend(now = new Date()) {
  const { y, m, d } = israelParts(now);
  if (y === 2026 && m === 10 && (d === 18 || d === 19)) {
    return { send: true, reason: 'final push (Sun/Mon, 3×/day)' };
  }
  return { send: false, reason: 'outside the Oct 18–19 send window' };
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
  const reminder = (
    await query(
      `SELECT COUNT(*) FILTER (WHERE reminder_sent_at IS NOT NULL)::int AS sent,
              COUNT(*) FILTER (WHERE validation_source = 'email' AND validation_status = 'confirmed')::int AS yes,
              COUNT(*) FILTER (WHERE validation_source = 'email' AND validation_status = 'unsure')::int AS unsure,
              COUNT(*) FILTER (WHERE validation_source = 'email' AND validation_status = 'declined')::int AS no
         FROM invitees`
    )
  ).rows[0];
  const noEmail = (
    await query(`SELECT COUNT(*)::int AS n FROM invitees WHERE email IS NULL OR email = ''`)
  ).rows[0].n;
  // Attendance validation (אישורי הגעה) across all sources (bot calls + email replies).
  const validation = (
    await query(
      `SELECT
         COUNT(*) FILTER (WHERE validation_status = 'confirmed')::int AS confirmed,
         COUNT(*) FILTER (WHERE validation_status = 'unsure')::int    AS unsure,
         COUNT(*) FILTER (WHERE validation_status = 'declined')::int  AS declined,
         COUNT(*) FILTER (WHERE validation_status = 'no_answer')::int AS no_answer,
         COUNT(*) FILTER (WHERE validation_status = 'callback')::int  AS callback,
         COUNT(*) FILTER (WHERE status = 'confirmed' AND validation_status IS NULL)::int AS pending
       FROM invitees`
    )
  ).rows[0];
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
    reminder,
    validation,
  };
}

// Compare current stats to the last stored snapshot and describe what changed.
async function computeChanges(cur) {
  const prev = (
    await query('SELECT stats, created_at FROM digest_snapshots ORDER BY id DESC LIMIT 1')
  ).rows[0];
  if (!prev) return { isFirst: true };

  const p = prev.stats;
  const sinceLabel = new Date(prev.created_at).toLocaleDateString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
  });
  const line = (label, now, before) => {
    const d = (now || 0) - (before || 0);
    return d ? `${label}: ${d > 0 ? '+' : '−'}${Math.abs(d)}` : null;
  };
  const deltas = [
    line('אושרה השתתפות', cur.confirmed, p.confirmed),
    line('ממתינים לאישור', cur.pending, p.pending),
    line('אולי', cur.maybe, p.maybe),
    line('סימנו שלא יגיעו', cur.declined, p.declined),
    line('רשימת המתנה', cur.waitlist, p.waitlist),
    line('הוזמנו במייל', cur.outreach_email, p.outreach_email),
    line('מוזמנים ברשימה', cur.total, p.total),
  ].filter(Boolean);

  // New RSVP responses since the previous digest.
  const subs = (
    await query(
      `SELECT full_name, organization, attendance, submitted_at
       FROM rsvp_submissions WHERE submitted_at > $1 ORDER BY submitted_at DESC`,
      [prev.created_at]
    )
  ).rows;
  const answer = { yes: 'כן', maybe: 'אולי', no: 'לא' };
  const newResponders = subs
    .slice(0, 12)
    .map((r) => `${r.full_name || '—'} · ${r.organization || '—'} · ${answer[r.attendance] || r.attendance || ''}`);
  if (subs.length > 12) newResponders.push(`ועוד ${subs.length - 12}…`);

  return { isFirst: false, sinceLabel, deltas, newResponders, newCount: subs.length };
}

function recommend(s) {
  const recs = [];
  // Final-push focus: attendance validation of the approved participants.
  const v = s.validation || {};
  if (v.pending > 0) recs.push(`${v.pending} מאושרים טרם אומתו טלפונית — להריץ סבב שיחות ולייבא את התוצאות.`);
  if (v.no_answer > 0) recs.push(`${v.no_answer} ללא מענה בשיחת האימות — לנסות שוב או לפנות בערוץ אחר.`);
  if (v.callback > 0) recs.push(`${v.callback} ביקשו שיחזרו אליהם — להשלים את החזרה.`);
  if (v.unsure > 0) recs.push(`${v.unsure} עדיין לא בטוחים אם יגיעו — לחזור אליהם לתשובה סופית.`);
  if (v.declined > 0) recs.push(`${v.declined} מאושרים הודיעו שלא יגיעו — לשקול השלמה מרשימת ההמתנה.`);
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
  const changes = await computeChanges(s);
  const { y, m, d } = israelParts();
  const dateLabel = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
  const daysToEvent = Math.max(0, Math.round((Date.UTC(2026, 9, 20) - Date.UTC(y, m - 1, d)) / 86400000));
  const msg = dailyDigest({ dateLabel, daysToEvent, stats: s, recommendations: recommend(s), changes });
  const res = await sendMail({
    to: RECIPIENTS,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    kind: msg.kind,
  });
  // Record a snapshot only for real, delivered scheduled digests, so the
  // "what changed" baseline advances once per real send (not on test/--force runs).
  if (res.sent && !force) {
    await query('INSERT INTO digest_snapshots (stats) VALUES ($1)', [JSON.stringify(s)]);
  }
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
