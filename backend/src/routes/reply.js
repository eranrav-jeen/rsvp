import express from 'express';
import { query, withTransaction } from '../db.js';
import { asyncHandler } from '../middleware.js';
import { sendMail } from '../mailer.js';
import { replyTeamNotice, teamRecipients } from '../emails.js';
import { verifyReplyToken } from '../replyToken.js';

// Public answers to the one-week reminder email ("will you attend?").
//
// The email's buttons open the /reply/:token page, which shows the chosen answer
// and only records it on an explicit POST. Recording on GET would be unsafe:
// corporate mail scanners (Outlook Safe Links etc.) "click" every link in an
// email, which would fire all three answers.
//
// Answers are stored in validation_status (shared with the calling bot) with
// validation_source = 'email'. "no" also moves the invitee to status 'declined'
// (freeing the seat) and emails the team; changing back to yes/unsure restores
// 'confirmed' when the decline came from this flow.

const router = express.Router();

const ANSWER_TO_VALIDATION = { yes: 'confirmed', unsure: 'unsure', no: 'declined' };
const VALIDATION_TO_ANSWER = { confirmed: 'yes', unsure: 'unsure', declined: 'no' };

function answerOf(inv) {
  return VALIDATION_TO_ANSWER[inv.validation_status] || null;
}

// Who may answer: confirmed participants, plus people who declined through this
// same flow (so they can change their mind).
function canAnswer(inv) {
  return inv.status === 'confirmed' || (inv.status === 'declined' && inv.validation_source === 'email');
}

// GET /api/reply/:token — who is answering and what they answered so far.
router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const id = verifyReplyToken(req.params.token);
    if (!id) return res.status(404).json({ error: 'invalid link' });
    const inv = (
      await query(
        'SELECT id, full_name, status, validation_status, validation_source FROM invitees WHERE id = $1',
        [id]
      )
    ).rows[0];
    if (!inv) return res.status(404).json({ error: 'invalid link' });
    res.json({
      name: inv.full_name || '',
      answer: answerOf(inv),
      canAnswer: canAnswer(inv),
    });
  })
);

// POST /api/reply/:token  { answer: 'yes' | 'unsure' | 'no' }
router.post(
  '/:token',
  asyncHandler(async (req, res) => {
    const id = verifyReplyToken(req.params.token);
    if (!id) return res.status(404).json({ error: 'invalid link' });
    const answer = String(req.body?.answer || '');
    const validation = ANSWER_TO_VALIDATION[answer];
    if (!validation) return res.status(400).json({ error: 'invalid answer' });

    const result = await withTransaction(async (client) => {
      const inv = (await client.query('SELECT * FROM invitees WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!inv) return { notFound: true };
      if (!canAnswer(inv)) return { notAllowed: true };

      let nextStatus = inv.status;
      if (answer === 'no') nextStatus = 'declined';
      else if (inv.status === 'declined') nextStatus = 'confirmed'; // changed their mind

      await client.query(
        `UPDATE invitees
            SET validation_status = $1,
                validation_source = 'email',
                validation_called_at = now(),
                status = $2,
                updated_at = now()
          WHERE id = $3`,
        [validation, nextStatus, id]
      );
      return { inv, prevAnswer: answerOf(inv), prevStatus: inv.status, nextStatus };
    });

    if (result.notFound) return res.status(404).json({ error: 'invalid link' });
    if (result.notAllowed) return res.status(409).json({ error: 'not allowed' });

    // Tell the team when a seat is freed or re-taken.
    if (result.prevStatus !== result.nextStatus) {
      const msg = replyTeamNotice({
        name: result.inv.full_name,
        organization: result.inv.organization,
        email: result.inv.email,
        phone: result.inv.phone,
        cancelled: result.nextStatus === 'declined',
      });
      sendMail({ to: teamRecipients(), ...msg, inviteeId: id }).catch((e) =>
        console.error('[reply] team notice error:', e.message)
      );
    }

    res.json({ ok: true, answer });
  })
);

export default router;
