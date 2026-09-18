import express from 'express';
import { withTransaction } from '../db.js';
import { lockAndCount, decideStatus } from '../capacity.js';
import { asyncHandler } from '../middleware.js';

const router = express.Router();

function clampPlusOnes(value) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, 20); // sanity cap
}

// Keep only the expected survey shape; store option letters (א/ב/ג/ד).
function cleanSurvey(s) {
  if (!s || typeof s !== 'object') return null;
  const q1 = typeof s.q1 === 'string' ? s.q1.slice(0, 4) : null;
  const q2 = Array.isArray(s.q2)
    ? s.q2.filter((x) => typeof x === 'string').slice(0, 10).map((x) => x.slice(0, 4))
    : [];
  const q3 = typeof s.q3 === 'string' ? s.q3.slice(0, 4) : null;
  if (!q1 && q2.length === 0 && !q3) return null;
  return { q1, q2, q3 };
}

// POST /api/rsvp  (public) — submit an RSVP
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      full_name,
      organization,
      role,
      email,
      phone,
      attendance,
      attending, // legacy boolean support
      plus_ones,
      dietary_notes,
      comments,
      survey,
    } = req.body || {};

    // Normalize attendance to yes | no | maybe.
    let att = attendance;
    if (att == null && typeof attending === 'boolean') att = attending ? 'yes' : 'no';
    if (!['yes', 'no', 'maybe'].includes(att)) {
      return res.status(400).json({ error: 'attendance must be yes, no or maybe' });
    }

    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({ error: 'full_name is required' });
    }
    if (!organization || !String(organization).trim()) {
      return res.status(400).json({ error: 'organization is required' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'email is required' });
    }
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ error: 'phone is required' });
    }

    const plusOnes = att === 'yes' ? clampPlusOnes(plus_ones) : 0;
    const requestedSeats = 1 + plusOnes;
    const emailNorm = String(email).trim();
    const orgNorm = String(organization).trim();
    const phoneNorm = String(phone).trim();
    const cleanedSurvey = cleanSurvey(survey);

    const result = await withTransaction(async (client) => {
      let resultingStatus;
      if (att === 'yes') {
        const { maxAttendees, confirmedSeats } = await lockAndCount(client);
        resultingStatus = decideStatus({
          attending: true,
          requestedSeats,
          confirmedSeats,
          maxAttendees,
        });
      } else if (att === 'no') {
        resultingStatus = 'declined';
      } else {
        resultingStatus = 'maybe';
      }

      // Find a matching invitee: by email (case-insensitive), else by organization
      // when the invitee row has no email on file.
      let match = await client.query(
        'SELECT * FROM invitees WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [emailNorm]
      );
      if (match.rows.length === 0) {
        match = await client.query(
          "SELECT * FROM invitees WHERE (email IS NULL OR email = '') AND organization = $1 ORDER BY id LIMIT 1",
          [orgNorm]
        );
      }

      let inviteeId;
      if (match.rows.length > 0) {
        const existing = match.rows[0];
        const updated = await client.query(
          `UPDATE invitees
             SET status = $1,
                 plus_ones = $2,
                 full_name = COALESCE(NULLIF($3, ''), full_name),
                 role = COALESCE(NULLIF($4, ''), role),
                 email = COALESCE(NULLIF($5, ''), email),
                 phone = COALESCE(NULLIF($6, ''), phone),
                 organization = $7,
                 source = CASE WHEN source = 'import' THEN 'rsvp_form' ELSE source END,
                 updated_at = now()
           WHERE id = $8
           RETURNING id`,
          [
            resultingStatus,
            plusOnes,
            String(full_name).trim(),
            role || '',
            emailNorm,
            phoneNorm,
            orgNorm,
            existing.id,
          ]
        );
        inviteeId = updated.rows[0].id;
      } else {
        const created = await client.query(
          `INSERT INTO invitees (organization, full_name, role, email, phone, status, plus_ones, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'rsvp_form')
           RETURNING id`,
          [
            orgNorm,
            String(full_name).trim(),
            role || null,
            emailNorm,
            phoneNorm,
            resultingStatus,
            plusOnes,
          ]
        );
        inviteeId = created.rows[0].id;
      }

      await client.query(
        `INSERT INTO rsvp_submissions
           (invitee_id, full_name, organization, role, email, phone, attending, attendance, plus_ones, dietary_notes, comments, resulting_status, survey)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          inviteeId,
          String(full_name).trim(),
          orgNorm,
          role || null,
          emailNorm,
          phoneNorm,
          att === 'yes',
          att,
          plusOnes,
          dietary_notes || null,
          comments || null,
          resultingStatus,
          cleanedSurvey ? JSON.stringify(cleanedSurvey) : null,
        ]
      );

      return { resultingStatus };
    });

    return res.json({ status: result.resultingStatus });
  })
);

export default router;
