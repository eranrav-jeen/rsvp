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
      "SELECT COALESCE(SUM(plus_ones + 1),0)::int AS confirmed_seats FROM invitees WHERE status = 'confirmed'"
    );
    res.json({
      max_attendees: settings.rows[0] ? settings.rows[0].max_attendees : 120,
      confirmed_seats: count.rows[0].confirmed_seats,
    });
  })
);

// PATCH /api/event-settings — update max_attendees
router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const max = Number.parseInt(req.body?.max_attendees, 10);
    if (Number.isNaN(max) || max < 1) {
      return res.status(400).json({ error: 'max_attendees must be a positive integer' });
    }
    const existing = await query('SELECT id FROM event_settings ORDER BY id LIMIT 1');
    if (existing.rows.length) {
      await query('UPDATE event_settings SET max_attendees = $1, updated_at = now() WHERE id = $2', [
        max,
        existing.rows[0].id,
      ]);
    } else {
      await query('INSERT INTO event_settings (max_attendees) VALUES ($1)', [max]);
    }
    res.json({ max_attendees: max });
  })
);

export default router;
