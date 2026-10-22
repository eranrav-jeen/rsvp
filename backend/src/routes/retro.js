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
           COUNT(*) FILTER (WHERE status IN ('confirmed', 'speaker'))::int AS approved,
           COUNT(*) FILTER (WHERE status = 'speaker')::int AS speakers,
           COUNT(*) FILTER (WHERE status = 'declined')::int AS declined,
           COUNT(*) FILTER (WHERE status = 'waitlist')::int AS waitlist,
           COUNT(*) FILTER (WHERE validation_status = 'confirmed')::int AS validated,
           COUNT(*) FILTER (WHERE arrived_at IS NOT NULL)::int AS arrived,
           COALESCE(SUM(COALESCE(arrived_guests, plus_ones)) FILTER (WHERE arrived_at IS NOT NULL), 0)::int AS guests,
           COUNT(*) FILTER (WHERE ${WALK_IN})::int AS walk_ins,
           COUNT(*) FILTER (WHERE status IN ('confirmed', 'speaker') AND arrived_at IS NOT NULL AND NOT (${WALK_IN}))::int AS approved_arrived,
           COUNT(*) FILTER (WHERE status IN ('confirmed', 'speaker') AND arrived_at IS NULL)::int AS no_shows,
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
    const notes = (await query('SELECT key, body, updated_at FROM retro_notes')).rows;
    res.json({
      stats: { ...f, registered, ...survey, emails: Object.fromEntries(emails.map((e) => [e.kind, e.n])) },
      topOrgs,
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
