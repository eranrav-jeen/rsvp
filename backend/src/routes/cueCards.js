import express from 'express';
import { query, withTransaction } from '../db.js';
import { asyncHandler } from '../middleware.js';

// Stage cue cards for the event MC and the panel host (admin only).
const router = express.Router();

const DECKS = ['mc', 'panel'];
const FIELDS = ['time_label', 'title', 'who', 'say', 'question', 'follow', 'notes'];

// GET /api/cue-cards
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM cue_cards ORDER BY deck, position, id');
    res.json({ cards: rows.rows });
  })
);

// POST /api/cue-cards  { deck }  — appends an empty card to the deck.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const deck = req.body?.deck;
    if (!DECKS.includes(deck)) return res.status(400).json({ error: 'invalid deck' });
    const rows = await query(
      `INSERT INTO cue_cards (deck, position, title)
       VALUES ($1, COALESCE((SELECT MAX(position) FROM cue_cards WHERE deck = $1), 0) + 1, 'כרטיס חדש')
       RETURNING *`,
      [deck]
    );
    res.status(201).json({ card: rows.rows[0] });
  })
);

// PATCH /api/cue-cards/:id  — update any of the text fields.
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const body = req.body || {};
    const sets = [];
    const params = [];
    for (const f of FIELDS) {
      if (f in body) {
        params.push(body[f] == null || String(body[f]).trim() === '' ? null : String(body[f]).slice(0, 5000));
        sets.push(`${f} = $${params.length}`);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
    params.push(id);
    const rows = await query(
      `UPDATE cue_cards SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows.rows.length) return res.status(404).json({ error: 'not found' });
    res.json({ card: rows.rows[0] });
  })
);

// POST /api/cue-cards/:id/move  { dir: -1 | 1 }  — swap with the neighbour in the deck.
router.post(
  '/:id/move',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const dir = Number(req.body?.dir) < 0 ? -1 : 1;
    await withTransaction(async (client) => {
      const card = (await client.query('SELECT * FROM cue_cards WHERE id = $1', [id])).rows[0];
      if (!card) return;
      // Normalise positions first so neighbours are always one apart.
      const deck = (
        await client.query('SELECT id FROM cue_cards WHERE deck = $1 ORDER BY position, id', [card.deck])
      ).rows.map((r) => r.id);
      const i = deck.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= deck.length) return;
      [deck[i], deck[j]] = [deck[j], deck[i]];
      for (let k = 0; k < deck.length; k += 1) {
        await client.query('UPDATE cue_cards SET position = $1 WHERE id = $2', [k + 1, deck[k]]);
      }
    });
    const rows = await query('SELECT * FROM cue_cards ORDER BY deck, position, id');
    res.json({ cards: rows.rows });
  })
);

// DELETE /api/cue-cards/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    await query('DELETE FROM cue_cards WHERE id = $1', [id]);
    res.json({ ok: true });
  })
);

export default router;
