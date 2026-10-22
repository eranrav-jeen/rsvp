// One-week reminder to confirmed participants, asking them to confirm, say
// they're unsure, or cancel (answers land in the dashboard's validation widget).
//
// Recipients: status = 'confirmed' (speakers excluded, Jeen staff included), with
// an email, and not already sent (reminder_sent_at is null) — so re-running only
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
// --audience=arrival sends the arrival instructions (ID for the QR elevator
// ticket, parking, transit) to approved participants and speakers who haven't
// cancelled, excluding Jeen staff; tracked by arrival_sent_at.
//
// --audience=feedback sends the post-event thank-you + survey link to everyone
// who was checked in at the door (arrived_at set), excluding Jeen staff;
// tracked by post_survey_sent_at.
//
// --audience=missed sends "what you missed" (takeaways, live attendance and
// pre-survey figures, survey link) to people who didn't attend: approved
// no-shows ('noshow' wording) and invitees who were invited / didn't respond /
// said maybe or no ('invited' wording). Not to people the organizers rejected,
// pending or waitlisted requests, never-invited, or Jeen staff; tracked by
// missed_sent_at.
//
// A test copy uses the invitee whose email matches --to (so its buttons work and
// record that person's answer); otherwise the buttons point to a sample link.

import { pool, query } from '../src/db.js';
import { sendMail } from '../src/mailer.js';
import { attendanceReminder, lastCallInvite, arrivalInstructions, postEventSurvey, missedEvent } from '../src/emails.js';
import { eventStats } from '../src/eventStats.js';
import { getAgenda } from '../src/agenda.js';
import { makeReplyToken, makeScopedToken } from '../src/replyToken.js';
import { SITE_URL } from '../src/event.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const noTestPrefix = args.includes('--no-test-prefix'); // test copy with the real subject
const toArg = args.find((a) => a.startsWith('--to='));
const testTo = toArg ? toArg.slice('--to='.length).trim() : '';
const audArg = args.find((a) => a.startsWith('--audience='));
const audience = audArg ? audArg.slice('--audience='.length) : 'reminder';
if (!['reminder', 'last-call', 'arrival', 'feedback', 'missed'].includes(audience)) {
  console.error(`[reminder] unknown --audience=${audience} (use reminder | last-call | arrival | feedback | missed)`);
  process.exit(1);
}
const lastCall = audience === 'last-call';
const arrival = audience === 'arrival';
const feedback = audience === 'feedback';
const missed = audience === 'missed';
let STATS = null; // live figures for the 'missed' email, loaded once
const SENT_COL = {
  reminder: 'reminder_sent_at',
  'last-call': 'last_call_sent_at',
  arrival: 'arrival_sent_at',
  feedback: 'post_survey_sent_at',
  missed: 'missed_sent_at',
}[audience];
// Feedback goes by door check-in (arrived_at), whatever the registration status.
const STATUSES = {
  reminder: ['confirmed'],
  'last-call': ['invited', 'no_response', 'maybe'],
  arrival: ['confirmed', 'speaker'],
  feedback: ['not_invited', 'invited', 'pending', 'confirmed', 'speaker', 'maybe', 'declined', 'waitlist', 'no_response'],
  missed: ['confirmed', 'speaker', 'invited', 'no_response', 'maybe', 'declined'],
}[audience];
const SKIP_JEEN = lastCall || arrival || feedback || missed;

function buildMessage(person, schedule) {
  if (lastCall) return lastCallInvite({ name: person.full_name, status: person.status || 'invited', schedule });
  if (arrival) return arrivalInstructions({ name: person.full_name });
  if (missed) {
    return missedEvent({
      name: person.full_name,
      variant: ['confirmed', 'speaker'].includes(person.status) ? 'noshow' : 'invited',
      surveyUrl: person.id ? `${SITE_URL}/feedback/${makeScopedToken('feedback', person.id)}` : `${SITE_URL}/feedback/sample`,
      stats: STATS,
    });
  }
  if (feedback) {
    return postEventSurvey({
      name: person.full_name,
      surveyUrl: person.id ? `${SITE_URL}/feedback/${makeScopedToken('feedback', person.id)}` : `${SITE_URL}/feedback/sample`,
    });
  }
  return attendanceReminder({
    name: person.full_name,
    replyUrl: person.id ? replyUrlFor(person.id) : `${SITE_URL}/reply/sample`,
    schedule,
  });
}
const PAUSE_MS = 1500; // between sends, to stay well under mailbox rate limits

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const replyUrlFor = (id) => `${SITE_URL}/reply/${makeReplyToken(id)}`;

async function main() {
  if (missed) STATS = await eventStats();
  const schedule = getAgenda();

  if (testTo) {
    const match = (
      await query('SELECT id, full_name, status FROM invitees WHERE LOWER(email) = LOWER($1) ORDER BY id LIMIT 1', [testTo])
    ).rows[0];
    const msg = buildMessage(match ? { ...match, status: 'invited' } : { full_name: '' }, schedule);
    const res = await sendMail({ to: testTo, subject: noTestPrefix ? msg.subject : `[בדיקה] ${msg.subject}`, html: msg.html, text: msg.text, kind: `${msg.kind}_test` });
    console.log(`[reminder] test → ${testTo}${match ? ` (invitee #${match.id})` : ' (sample links)'}: ${JSON.stringify(res)}`);
    return;
  }

  const rows = (
    await query(
      `SELECT id, full_name, email, organization, status
         FROM invitees
        WHERE status = ANY($1::text[])
          AND NULLIF(TRIM(email), '') IS NOT NULL
          -- Jeen staff get the confirmed reminder too; last call / arrival skip them.
          AND ($2::boolean IS FALSE OR (LOWER(email) NOT LIKE '%@jeen.ai'
                                        AND LOWER(COALESCE(organization, '')) <> 'jeen'))
          -- Arrival instructions: not to people who cancelled on a validation call.
          AND ($3::boolean IS FALSE OR validation_status IS DISTINCT FROM 'declined')
          -- Feedback survey: only people checked in at the door.
          AND ($4::boolean IS FALSE OR arrived_at IS NOT NULL)
          -- Missed: didn't attend, and not a request the organizers rejected
          -- (declined although their latest form answer was yes, without
          -- cancelling themselves).
          AND ($5::boolean IS FALSE OR (arrived_at IS NULL AND NOT (
                status = 'declined' AND validation_status IS DISTINCT FROM 'declined'
                AND (SELECT s.attendance FROM rsvp_submissions s WHERE s.invitee_id = invitees.id
                      ORDER BY s.submitted_at DESC LIMIT 1) = 'yes')))
          AND ${SENT_COL} IS NULL
        ORDER BY id`,
      [STATUSES, SKIP_JEEN, arrival, feedback, missed]
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
    const msg = buildMessage(r, schedule);
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
