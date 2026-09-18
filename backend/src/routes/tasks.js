import express from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../middleware.js';

const router = express.Router();
const VALID = ['open', 'in_progress', 'done'];

// GET /api/tasks
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT * FROM tasks ORDER BY
         CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
         due_date NULLS LAST, id`
    );
    res.json({ tasks: rows.rows });
  })
);

// POST /api/tasks
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { owner, title, status, due_date, due_date_text, notes } = req.body || {};
    if (!owner || !String(owner).trim()) return res.status(400).json({ error: 'owner is required' });
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
    const st = VALID.includes(status) ? status : 'open';
    const rows = await query(
      `INSERT INTO tasks (owner, title, status, due_date, due_date_text, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        String(owner).trim(),
        String(title).trim(),
        st,
        due_date || null,
        due_date_text || null,
        notes || null,
      ]
    );
    res.status(201).json({ task: rows.rows[0] });
  })
);

// PATCH /api/tasks/:id
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const b = req.body || {};
    if (b.status && !VALID.includes(b.status)) return res.status(400).json({ error: 'invalid status' });

    const setDueDate = Object.prototype.hasOwnProperty.call(b, 'due_date');
    const rows = await query(
      `UPDATE tasks SET
         owner = COALESCE($1, owner),
         title = COALESCE($2, title),
         status = COALESCE($3, status),
         due_date = CASE WHEN $4::boolean THEN $5::date ELSE due_date END,
         due_date_text = COALESCE($6, due_date_text),
         notes = COALESCE($7, notes),
         updated_at = now()
       WHERE id = $8 RETURNING *`,
      [
        b.owner ?? null,
        b.title ?? null,
        b.status ?? null,
        setDueDate,
        setDueDate ? b.due_date || null : null,
        b.due_date_text ?? null,
        b.notes ?? null,
        id,
      ]
    );
    if (rows.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ task: rows.rows[0] });
  })
);

// DELETE /api/tasks/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const rows = await query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    if (rows.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  })
);

export default router;
