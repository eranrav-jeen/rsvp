import express from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../middleware.js';
import { verifyScopedToken } from '../replyToken.js';
import { cleanAnswers } from '../feedbackSurvey.js';

// Public post-event survey (personal signed link from the thank-you email).
const router = express.Router();

// GET /api/feedback/:token — who is answering + their previous answers, if any.
router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const id = verifyScopedToken('feedback', req.params.token);
    if (!id) return res.status(404).json({ error: 'invalid link' });
    const row = (
      await query(
        `SELECT i.full_name, r.answers FROM invitees i
           LEFT JOIN post_survey_responses r ON r.invitee_id = i.id
          WHERE i.id = $1`,
        [id]
      )
    ).rows[0];
    if (!row) return res.status(404).json({ error: 'invalid link' });
    res.json({ name: row.full_name || '', answers: row.answers || null });
  })
);

// POST /api/feedback/:token  { answers }
router.post(
  '/:token',
  asyncHandler(async (req, res) => {
    const id = verifyScopedToken('feedback', req.params.token);
    if (!id) return res.status(404).json({ error: 'invalid link' });
    const { answers } = cleanAnswers(req.body?.answers);
    if (!Object.keys(answers).length) return res.status(400).json({ error: 'no answers' });
    const exists = (await query('SELECT 1 FROM invitees WHERE id = $1', [id])).rowCount;
    if (!exists) return res.status(404).json({ error: 'invalid link' });
    await query(
      `INSERT INTO post_survey_responses (invitee_id, answers) VALUES ($1, $2)
       ON CONFLICT (invitee_id) DO UPDATE SET answers = EXCLUDED.answers, updated_at = now()`,
      [id, JSON.stringify(answers)]
    );
    res.json({ ok: true });
  })
);

export default router;
