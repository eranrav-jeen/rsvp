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
// A test copy uses the invitee whose email matches --to (so its buttons work and
// record that person's answer); otherwise the buttons point to a sample link.

import { pool, query } from '../src/db.js';
import { sendMail } from '../src/mailer.js';
import { attendanceReminder } from '../src/emails.js';
import { getAgenda } from '../src/agenda.js';
import { makeReplyToken } from '../src/replyToken.js';
import { SITE_URL } from '../src/event.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const toArg = args.find((a) => a.startsWith('--to='));
const testTo = toArg ? toArg.slice('--to='.length).trim() : '';
const PAUSE_MS = 1500; // between sends, to stay well under mailbox rate limits

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const replyUrlFor = (id) => `${SITE_URL}/reply/${makeReplyToken(id)}`;

async function main() {
  const schedule = getAgenda();

  if (testTo) {
    const match = (
      await query('SELECT id, full_name FROM invitees WHERE LOWER(email) = LOWER($1) ORDER BY id LIMIT 1', [testTo])
    ).rows[0];
    const msg = attendanceReminder({
      name: match ? match.full_name : '',
      replyUrl: match ? replyUrlFor(match.id) : `${SITE_URL}/reply/sample`,
      schedule,
    });
    const res = await sendMail({ to: testTo, subject: `[בדיקה] ${msg.subject}`, html: msg.html, text: msg.text, kind: 'reminder_test' });
    console.log(`[reminder] test → ${testTo}${match ? ` (invitee #${match.id})` : ' (sample links)'}: ${JSON.stringify(res)}`);
    return;
  }

  const rows = (
    await query(
      `SELECT id, full_name, email, organization
         FROM invitees
        WHERE status = 'confirmed'
          AND NULLIF(TRIM(email), '') IS NOT NULL
          AND LOWER(email) NOT LIKE '%@jeen.ai'
          AND LOWER(COALESCE(organization, '')) <> 'jeen'
          AND reminder_sent_at IS NULL
        ORDER BY id`
    )
  ).rows;

  console.log(`[reminder] ${rows.length} recipient(s)${dryRun ? ' — dry run, nothing sent' : ''}`);
  if (dryRun) {
    for (const r of rows) console.log(`  #${r.id}  ${r.full_name || '—'}  <${r.email}>  ${r.organization || ''}`);
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    const msg = attendanceReminder({ name: r.full_name, replyUrl: replyUrlFor(r.id), schedule });
    const res = await sendMail({ to: r.email, subject: msg.subject, html: msg.html, text: msg.text, kind: msg.kind, inviteeId: r.id });
    if (res.sent) {
      await query('UPDATE invitees SET reminder_sent_at = now() WHERE id = $1', [r.id]);
      sent += 1;
      console.log(`  ✓ #${r.id} ${r.email}`);
    } else {
      failed += 1;
      console.log(`  ✗ #${r.id} ${r.email}: ${res.error || 'not sent'}`);
    }
    await sleep(PAUSE_MS);
  }
  console.log(`[reminder] done — sent ${sent}, failed ${failed}. Re-run to retry failures.`);
}

main()
  .catch((e) => {
    console.error('[reminder] error:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
