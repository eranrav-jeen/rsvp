import express from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../middleware.js';

// Admin "סיכום ותחקיר": event summary statistics + shared reflection notes.
const router = express.Router();

// Participants = everyone except Jeen staff.
const NOT_JEEN = "NOT (LOWER(COALESCE(email,'')) LIKE '%@jeen.ai' OR LOWER(COALESCE(organization,'')) = 'jeen')";
// Added at the door: created and checked in within the same minute.
const WALK_IN = 'arrived_at IS NOT NULL AND ABS(EXTRACT(EPOCH FROM (arrived_at - created_at))) < 120';

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const f = (
      await query(
        `SELECT
           COUNT(*)::int AS list_total,
           COUNT(*) FILTER (WHERE status <> 'not_invited' AND NOT (${WALK_IN}))::int AS invited,
           COUNT(*) FILTER (WHERE status IN ('confirmed', 'speaker') AND NOT (${WALK_IN}))::int AS approved,
           COUNT(*) FILTER (WHERE status = 'speaker')::int AS speakers,
           COUNT(*) FILTER (WHERE status = 'declined')::int AS declined,
           COUNT(*) FILTER (WHERE status = 'waitlist')::int AS waitlist,
           COUNT(*) FILTER (WHERE validation_status = 'confirmed')::int AS validated,
           COUNT(*) FILTER (WHERE arrived_at IS NOT NULL)::int AS arrived,
           COALESCE(SUM(COALESCE(arrived_guests, plus_ones)) FILTER (WHERE arrived_at IS NOT NULL), 0)::int AS guests,
           COUNT(*) FILTER (WHERE ${WALK_IN})::int AS walk_ins,
           COUNT(*) FILTER (WHERE status IN ('confirmed', 'speaker') AND arrived_at IS NOT NULL AND NOT (${WALK_IN}))::int AS approved_arrived,
           COUNT(*) FILTER (WHERE status IN ('confirmed', 'speaker') AND arrived_at IS NULL)::int AS no_shows, -- walk-ins always arrived
           COUNT(DISTINCT LOWER(TRIM(organization))) FILTER (WHERE arrived_at IS NOT NULL)::int AS orgs_arrived,
           COUNT(*) FILTER (WHERE outreach_email OR agenda_email)::int AS by_email,
           COUNT(*) FILTER (WHERE outreach_whatsapp OR agenda_whatsapp)::int AS by_whatsapp,
           COUNT(*) FILTER (WHERE outreach_call OR agenda_call)::int AS by_call,
           COUNT(*) FILTER (WHERE post_survey_sent_at IS NOT NULL)::int AS survey_sent
         FROM invitees WHERE ${NOT_JEEN}`
      )
    ).rows[0];
    const registered = (
      await query(
        `SELECT COUNT(DISTINCT s.invitee_id)::int AS n
           FROM rsvp_submissions s JOIN invitees i ON i.id = s.invitee_id
          WHERE s.attendance = 'yes' AND ${NOT_JEEN.replace(/email|organization/g, (m) => `i.${m}`)}`
      )
    ).rows[0].n;
    const survey = (
      await query(
        `SELECT COUNT(*)::int AS responded,
                COUNT(*) FILTER (WHERE answers->>'meeting' = 'yes')::int AS meeting_yes
           FROM post_survey_responses`
      )
    ).rows[0];
    const emails = (
      await query(
        `SELECT kind, COUNT(*)::int AS n FROM email_log
          WHERE status = 'sent' AND kind IN ('reminder', 'last_call', 'arrival', 'post_survey', 'daily_digest')
          GROUP BY kind`
      )
    ).rows;
    const topOrgs = (
      await query(
        `SELECT MIN(organization) AS organization, COUNT(*)::int AS n
           FROM invitees WHERE arrived_at IS NOT NULL AND ${NOT_JEEN}
          GROUP BY LOWER(TRIM(organization)) ORDER BY n DESC, 1 LIMIT 10`
      )
    ).rows;
    // Everyone who ended up "not coming", by cause. "Rejected" = asked to come
    // via the form (attendance yes) and was declined by the organizers, not a
    // self-cancellation (validation answer 'declined' by email / phone).
    const declinedRows = (
      await query(
        `SELECT i.id, i.full_name, i.organization, i.role, i.validation_status,
                EXISTS (SELECT 1 FROM rsvp_submissions s WHERE s.invitee_id = i.id AND s.attendance = 'yes') AS asked_yes,
                (SELECT s.attendance FROM rsvp_submissions s WHERE s.invitee_id = i.id
                  ORDER BY s.submitted_at DESC LIMIT 1) AS last_answer,
                EXISTS (SELECT 1 FROM email_log e WHERE e.invitee_id = i.id AND e.kind = 'declined' AND e.status = 'sent') AS notified
           FROM invitees i
          WHERE i.status = 'declined' AND ${NOT_JEEN.replace(/email|organization/g, (m) => `i.${m}`)}
          ORDER BY i.organization, i.full_name`
      )
    ).rows;
    const declined = { total: declinedRows.length, rejected: [], cancelled: 0, said_no: 0, other: 0, notified: 0 };
    for (const r of declinedRows) {
      if (r.validation_status === 'declined') declined.cancelled += 1;
      else if (r.asked_yes && r.last_answer === 'yes') {
        declined.rejected.push({ full_name: r.full_name, organization: r.organization, role: r.role });
        if (r.notified) declined.notified += 1;
      } else if (r.last_answer === 'no') declined.said_no += 1;
      else declined.other += 1;
    }
    const rejectedOrgs = Object.entries(
      declined.rejected.reduce((acc, r) => {
        const k = r.organization || '—';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([organization, n]) => ({ organization, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);

    // Arrived without being approved in advance and not added at the door:
    // their registration status when checked in (pending / invited / maybe …).
    const unapproved = (
      await query(
        `SELECT status, COUNT(*)::int AS n FROM invitees
          WHERE arrived_at IS NOT NULL AND status NOT IN ('confirmed', 'speaker')
            AND NOT (${WALK_IN}) AND ${NOT_JEEN}
          GROUP BY status ORDER BY n DESC`
      )
    ).rows;

    const notes = (await query('SELECT key, body, updated_at FROM retro_notes')).rows;
    res.json({
      stats: { ...f, registered, ...survey, emails: Object.fromEntries(emails.map((e) => [e.kind, e.n])) },
      topOrgs,
      declined: { ...declined, rejectedOrgs },
      unapproved,
      notes,
    });
  })
);

// PUT /api/retro/notes/:key  { body }
router.put(
  '/notes/:key',
  asyncHandler(async (req, res) => {
    const key = String(req.params.key || '').slice(0, 64);
    if (!/^[a-z0-9_-]+$/.test(key)) return res.status(400).json({ error: 'invalid key' });
    const body = String(req.body?.body ?? '').slice(0, 20000);
    const row = (
      await query(
        `INSERT INTO retro_notes (key, body, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET body = EXCLUDED.body, updated_at = now()
         RETURNING key, body, updated_at`,
        [key, body]
      )
    ).rows[0];
    res.json({ note: row });
  })
);

export default router;
