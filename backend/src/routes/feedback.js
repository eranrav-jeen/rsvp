import express from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../middleware.js';
import { verifyScopedToken } from '../replyToken.js';
import { cleanAnswers } from '../feedbackSurvey.js';
import { sendMail } from '../mailer.js';
import { meetingRequestNotice, teamRecipients } from '../emails.js';

// Public post-event survey (personal signed link from the thank-you email).
const router = express.Router();

// Generic community link (/feedback/community) — anyone can fill it, no token.
// Responses are anonymous (optional contact), stored separately per submission.
// Registered BEFORE /:token so the literal path wins.
router.get(
  '/community',
  asyncHandler(async (req, res) => {
    res.json({ name: '', attended: false, answers: null, community: true });
  })
);

router.post(
  '/community',
  asyncHandler(async (req, res) => {
    const { answers } = cleanAnswers(req.body?.answers);
    if (!Object.keys(answers).length) return res.status(400).json({ error: 'no answers' });
    const c = req.body?.contact || {};
    const str = (v, n) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
    const name = str(c.name, 120);
    const organization = str(c.organization, 160);
    const email = str(c.email, 160);
    await query(
      `INSERT INTO community_survey_responses (name, organization, email, answers)
       VALUES ($1, $2, $3, $4)`,
      [name, organization, email, JSON.stringify(answers)]
    );
    // Someone from the community asked for a meeting: notify the team to follow up.
    if (answers.meeting === 'yes') {
      const msg = meetingRequestNotice({ full_name: name, organization, email, phone: null, answers, community: true });
      sendMail({ to: teamRecipients(), ...msg }).catch((e) =>
        console.error('[feedback] community meeting notice error:', e.message)
      );
    }
    res.json({ ok: true });
  })
);

// GET /api/feedback/:token — who is answering + their previous answers, if any.
router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const id = verifyScopedToken('feedback', req.params.token);
    if (!id) return res.status(404).json({ error: 'invalid link' });
    const row = (
      await query(
        `SELECT i.full_name, i.arrived_at, r.answers FROM invitees i
           LEFT JOIN post_survey_responses r ON r.invitee_id = i.id
          WHERE i.id = $1`,
        [id]
      )
    ).rows[0];
    if (!row) return res.status(404).json({ error: 'invalid link' });
    res.json({ name: row.full_name || '', attended: !!row.arrived_at, answers: row.answers || null });
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
    const inv = (
      await query(
        `SELECT i.full_name, i.organization, i.role, i.email, i.phone, r.answers AS prev
           FROM invitees i LEFT JOIN post_survey_responses r ON r.invitee_id = i.id
          WHERE i.id = $1`,
        [id]
      )
    ).rows[0];
    if (!inv) return res.status(404).json({ error: 'invalid link' });
    await query(
      `INSERT INTO post_survey_responses (invitee_id, answers) VALUES ($1, $2)
       ON CONFLICT (invitee_id) DO UPDATE SET answers = EXCLUDED.answers, updated_at = now()`,
      [id, JSON.stringify(answers)]
    );
    // Someone asked for a meeting (newly): tell the team so they follow up.
    if (answers.meeting === 'yes' && inv.prev?.meeting !== 'yes') {
      const msg = meetingRequestNotice({ ...inv, answers });
      sendMail({ to: teamRecipients(), ...msg, inviteeId: id }).catch((e) =>
        console.error('[feedback] meeting notice error:', e.message)
      );
    }
    res.json({ ok: true });
  })
);

export default router;
