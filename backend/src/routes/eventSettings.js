import express from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../middleware.js';

const router = express.Router();

// GET /api/event-settings — max_attendees + current confirmed seat count
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const settings = await query('SELECT * FROM event_settings ORDER BY id LIMIT 1');
    const count = await query(
      "SELECT COALESCE(SUM(plus_ones + 1),0)::int AS confirmed_seats FROM invitees WHERE status IN ('confirmed','speaker')"
    );
    res.json({
      max_attendees: settings.rows[0] ? settings.rows[0].max_attendees : 120,
      approval_required: settings.rows[0] ? settings.rows[0].approval_required : true,
      confirmed_seats: count.rows[0].confirmed_seats,
    });
  })
);

// PATCH /api/event-settings — update max_attendees and/or approval_required
router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const hasMax = body.max_attendees !== undefined;
    const hasApproval = body.approval_required !== undefined;
    if (!hasMax && !hasApproval) {
      return res.status(400).json({ error: 'nothing to update' });
    }

    let max = null;
    if (hasMax) {
      max = Number.parseInt(body.max_attendees, 10);
      if (Number.isNaN(max) || max < 1) {
        return res.status(400).json({ error: 'max_attendees must be a positive integer' });
      }
    }
    const approval = hasApproval ? !!body.approval_required : null;

    const existing = await query('SELECT id FROM event_settings ORDER BY id LIMIT 1');
    if (!existing.rows.length) {
      await query('INSERT INTO event_settings (max_attendees, approval_required) VALUES ($1, $2)', [
        max ?? 120,
        approval ?? true,
      ]);
    } else {
      await query(
        `UPDATE event_settings SET
           max_attendees = COALESCE($1, max_attendees),
           approval_required = COALESCE($2, approval_required),
           updated_at = now()
         WHERE id = $3`,
        [max, approval, existing.rows[0].id]
      );
    }
    const updated = await query('SELECT max_attendees, approval_required FROM event_settings ORDER BY id LIMIT 1');
    res.json(updated.rows[0]);
  })
);

export default router;
