import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { asyncHandler } from '../middleware.js';
import { EVENT } from '../event.js';

// Attendance-validation API for the external AI calling bot.
//
// The bot (1) pulls the list of confirmed participants to call via
// GET /api/validation/call-list and (2) posts back the outcome of each call via
// POST /api/validation/result. Both are protected by a static bearer token
// (VALIDATION_API_KEY in the server .env) — this is a machine-to-machine API, it
// does NOT use the admin session cookie.

const router = Router();

// Allowed call outcomes the bot may report.
const VALID_RESULTS = new Set(['confirmed', 'declined', 'no_answer', 'callback', 'wrong_number']);

// Bearer-token gate. Returns 503 when no key is configured, so the endpoint is
// never silently open in production.
function requireBotKey(req, res, next) {
  const expected = process.env.VALIDATION_API_KEY || '';
  if (!expected) return res.status(503).json({ error: 'validation api not configured' });
  const header = req.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  const submitted = m ? m[1] : (req.get('x-api-key') || '');
  const a = Buffer.from(String(submitted));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}

router.use(requireBotKey);

// Normalise a phone number to its last 9 digits (Israeli subscriber part), so
// +972-50-123-4567, 050-1234567 and 0501234567 all match.
function normPhone(p) {
  const digits = String(p || '').replace(/\D/g, '');
  return digits.length > 9 ? digits.slice(-9) : digits;
}

// GET /api/validation/call-list
//   ?pending=1          → only participants not yet validated (no result recorded)
//   ?include_speakers=1 → also include status='speaker' (default: confirmed only)
// Returns confirmed participants that have a phone number.
router.get(
  '/call-list',
  asyncHandler(async (req, res) => {
    const pendingOnly = req.query.pending === '1' || req.query.pending === 'true';
    const includeSpeakers = req.query.include_speakers === '1' || req.query.include_speakers === 'true';
    const statuses = includeSpeakers ? ['confirmed', 'speaker'] : ['confirmed'];
    const rows = (
      await query(
        `SELECT id, full_name, organization, role, phone, status,
                validation_status, validation_called_at
           FROM invitees
          WHERE status = ANY($1::text[])
            AND phone IS NOT NULL AND btrim(phone) <> ''
            AND ($2::boolean IS FALSE OR validation_status IS NULL)
          ORDER BY organization, id`,
        [statuses, pendingOnly]
      )
    ).rows;
    res.json({
      event: EVENT.title,
      count: rows.length,
      participants: rows.map((r) => ({
        id: r.id,
        full_name: r.full_name || '',
        organization: r.organization || '',
        role: r.role || '',
        phone: r.phone,
        status: r.status,
        validation_status: r.validation_status,
        validated_at: r.validation_called_at,
      })),
    });
  })
);

// POST /api/validation/result
// Body: a single result object, or { results: [ ... ] } for a batch.
// Each result: { id?, phone?, result, notes?, called_at? }
//   - identify the participant by `id` (preferred) or `phone`
//   - `result` must be one of VALID_RESULTS
// Returns per-item { matched, id?, result?, error? }.
router.post(
  '/result',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const items = Array.isArray(body.results) ? body.results : [body];
    if (items.length === 0) return res.status(400).json({ error: 'no results provided' });

    const out = [];
    for (const item of items) {
      const result = String(item?.result || '').toLowerCase().trim();
      if (!VALID_RESULTS.has(result)) {
        out.push({ matched: false, error: `invalid result "${item?.result}"`, id: item?.id ?? null });
        continue;
      }
      const calledAt = item.called_at ? new Date(item.called_at) : new Date();
      const whenValid = !Number.isNaN(calledAt.getTime()) ? calledAt : new Date();
      const notes = item.notes != null ? String(item.notes).slice(0, 2000) : null;

      // Resolve the target row: by id if given, else by normalised phone.
      let targetId = Number.parseInt(item.id, 10);
      if (Number.isNaN(targetId)) {
        if (!item.phone) {
          out.push({ matched: false, error: 'missing id and phone' });
          continue;
        }
        const np = normPhone(item.phone);
        if (np.length < 7) {
          out.push({ matched: false, error: 'unrecognised phone', phone: item.phone });
          continue;
        }
        const match = (
          await query(
            `SELECT id FROM invitees
              WHERE phone IS NOT NULL AND right(regexp_replace(phone, '\\D', '', 'g'), 9) = $1
              ORDER BY id LIMIT 1`,
            [np]
          )
        ).rows[0];
        if (!match) {
          out.push({ matched: false, error: 'no participant with that phone', phone: item.phone });
          continue;
        }
        targetId = match.id;
      }

      const upd = await query(
        `UPDATE invitees
            SET validation_status = $1,
                validation_called_at = $2,
                validation_notes = COALESCE($3, validation_notes),
                updated_at = now()
          WHERE id = $4
          RETURNING id`,
        [result, whenValid.toISOString(), notes, targetId]
      );
      if (upd.rowCount === 0) {
        out.push({ matched: false, error: 'no participant with that id', id: targetId });
      } else {
        out.push({ matched: true, id: targetId, result });
      }
    }

    const updated = out.filter((o) => o.matched).length;
    res.json({ updated, results: out });
  })
);

export default router;
