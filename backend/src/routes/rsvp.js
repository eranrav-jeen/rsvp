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
      attending,
      plus_ones,
      dietary_notes,
      comments,
    } = req.body || {};

    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({ error: 'full_name is required' });
    }
    if (!organization || !String(organization).trim()) {
      return res.status(400).json({ error: 'organization is required' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'email is required' });
    }
    if (typeof attending !== 'boolean') {
      return res.status(400).json({ error: 'attending must be true or false' });
    }

    const plusOnes = attending ? clampPlusOnes(plus_ones) : 0;
    const requestedSeats = 1 + plusOnes;
    const emailNorm = String(email).trim();
    const orgNorm = String(organization).trim();

    const result = await withTransaction(async (client) => {
      const { maxAttendees, confirmedSeats } = await lockAndCount(client);

      const resultingStatus = decideStatus({
        attending,
        requestedSeats,
        confirmedSeats,
        maxAttendees,
      });

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
            attending ? plusOnes : 0,
            String(full_name).trim(),
            role || '',
            emailNorm,
            phone || '',
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
            phone || null,
            resultingStatus,
            attending ? plusOnes : 0,
          ]
        );
        inviteeId = created.rows[0].id;
      }

      await client.query(
        `INSERT INTO rsvp_submissions
           (invitee_id, full_name, organization, role, email, phone, attending, plus_ones, dietary_notes, comments, resulting_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          inviteeId,
          String(full_name).trim(),
          orgNorm,
          role || null,
          emailNorm,
          phone || null,
          attending,
          attending ? plusOnes : 0,
          dietary_notes || null,
          comments || null,
          resultingStatus,
        ]
      );

      return { resultingStatus };
    });

    return res.json({ status: result.resultingStatus });
  })
);

export default router;
