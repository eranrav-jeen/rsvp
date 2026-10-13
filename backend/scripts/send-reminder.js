// One-week reminder to confirmed participants, asking them to confirm, say
// they're unsure, or cancel (answers land in the dashboard's validation widget).
//
// Recipients: status = 'confirmed' (speakers excluded), with an email, not Jeen
// staff, and not already sent (reminder_sent_at is null) — so re-running only
// picks up whoever was missed.
//
//   node scripts/send-reminder.js --dry-run            list who would get it
//   node scripts/send-reminder.js --to=eran@jeen.ai    send one test copy
//   node scripts/send-reminder.js                      send to everyone
//
// --audience=last-call switches to the "last call" invitation instead: people
// invited but not registered (status invited / no_response) or who answered
// "maybe", tracked by last_call_sent_at. Same --dry-run / --to= modes.
//
// A test copy uses the invitee whose email matches --to (so its buttons work and
// record that person's answer); otherwise the buttons point to a sample link.

import { pool, query } from '../src/db.js';
import { sendMail } from '../src/mailer.js';
import { attendanceReminder, lastCallInvite } from '../src/emails.js';
import { getAgenda } from '../src/agenda.js';
import { makeReplyToken } from '../src/replyToken.js';
import { SITE_URL } from '../src/event.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const toArg = args.find((a) => a.startsWith('--to='));
const testTo = toArg ? toArg.slice('--to='.length).trim() : '';
const audArg = args.find((a) => a.startsWith('--audience='));
const audience = audArg ? audArg.slice('--audience='.length) : 'reminder';
if (!['reminder', 'last-call'].includes(audience)) {
  console.error(`[reminder] unknown --audience=${audience} (use reminder | last-call)`);
  process.exit(1);
}
const lastCall = audience === 'last-call';
const SENT_COL = lastCall ? 'last_call_sent_at' : 'reminder_sent_at';
const STATUSES = lastCall ? ['invited', 'no_response', 'maybe'] : ['confirmed'];
const PAUSE_MS = 1500; // between sends, to stay well under mailbox rate limits

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const replyUrlFor = (id) => `${SITE_URL}/reply/${makeReplyToken(id)}`;

async function main() {
  const schedule = getAgenda();

  if (testTo) {
    const match = (
      await query('SELECT id, full_name, status FROM invitees WHERE LOWER(email) = LOWER($1) ORDER BY id LIMIT 1', [testTo])
    ).rows[0];
    const msg = lastCall
      ? lastCallInvite({ name: match ? match.full_name : '', status: 'invited', schedule })
      : attendanceReminder({
          name: match ? match.full_name : '',
          replyUrl: match ? replyUrlFor(match.id) : `${SITE_URL}/reply/sample`,
          schedule,
        });
    const res = await sendMail({ to: testTo, subject: `[בדיקה] ${msg.subject}`, html: msg.html, text: msg.text, kind: `${msg.kind}_test` });
    console.log(`[reminder] test → ${testTo}${match ? ` (invitee #${match.id})` : ' (sample links)'}: ${JSON.stringify(res)}`);
    return;
  }

  const rows = (
    await query(
      `SELECT id, full_name, email, organization, status
         FROM invitees
        WHERE status = ANY($1::text[])
          AND NULLIF(TRIM(email), '') IS NOT NULL
          AND LOWER(email) NOT LIKE '%@jeen.ai'
          AND LOWER(COALESCE(organization, '')) <> 'jeen'
          AND ${SENT_COL} IS NULL
        ORDER BY id`,
      [STATUSES]
    )
  ).rows;

  console.log(`[${audience}] ${rows.length} recipient(s)${dryRun ? ' — dry run, nothing sent' : ''}`);
  if (dryRun) {
    for (const r of rows) console.log(`  #${r.id}  ${r.full_name || '—'}  <${r.email}>  ${r.organization || ''}  [${r.status}]`);
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    const msg = lastCall
      ? lastCallInvite({ name: r.full_name, status: r.status, schedule })
      : attendanceReminder({ name: r.full_name, replyUrl: replyUrlFor(r.id), schedule });
    const res = await sendMail({ to: r.email, subject: msg.subject, html: msg.html, text: msg.text, kind: msg.kind, inviteeId: r.id });
    if (res.sent) {
      await query(`UPDATE invitees SET ${SENT_COL} = now() WHERE id = $1`, [r.id]);
      sent += 1;
      console.log(`  ✓ #${r.id} ${r.email}`);
    } else {
      failed += 1;
      console.log(`  ✗ #${r.id} ${r.email}: ${res.error || 'not sent'}`);
    }
    await sleep(PAUSE_MS);
  }
  console.log(`[${audience}] done — sent ${sent}, failed ${failed}. Re-run to retry failures.`);
}

main()
  .catch((e) => {
    console.error('[reminder] error:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
