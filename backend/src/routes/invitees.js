import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { query, withTransaction } from '../db.js';
import { lockAndCount, decideStatus } from '../capacity.js';
import { asyncHandler } from '../middleware.js';
import { sendMail } from '../mailer.js';
import { participationApproved, participationDeclined } from '../emails.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const VALID_STATUSES = ['not_invited', 'invited', 'pending', 'confirmed', 'speaker', 'maybe', 'declined', 'waitlist', 'no_response'];

// SQL fragments to identify Jeen employees (email @jeen.ai or org "jeen") and
// the group we de-emphasise (speakers + Jeen employees) at the bottom of the list.
const IS_JEEN = "(LOWER(COALESCE(email,'')) LIKE '%@jeen.ai' OR LOWER(organization) = 'jeen')";
const IS_DEEMPHASIZED = `(status = 'speaker' OR ${IS_JEEN})`;

// GET /api/invitees — list + filter + search + summary counters
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, q } = req.query;
    const excludeJeen = req.query.exclude_jeen === '1' || req.query.exclude_jeen === 'true';
    const excludeSpeakers = req.query.exclude_speakers === '1' || req.query.exclude_speakers === 'true';
    const params = [];
    const clauses = [];

    if (status && VALID_STATUSES.includes(status)) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }
    if (q && String(q).trim()) {
      params.push(`%${String(q).trim().toLowerCase()}%`);
      const p = `$${params.length}`;
      clauses.push(
        `(LOWER(organization) LIKE ${p} OR LOWER(COALESCE(full_name,'')) LIKE ${p} OR LOWER(COALESCE(email,'')) LIKE ${p} OR LOWER(COALESCE(role,'')) LIKE ${p})`
      );
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    // Push speakers and Jeen employees to the bottom of the list.
    const rows = await query(
      `SELECT * FROM invitees ${where}
       ORDER BY (CASE WHEN ${IS_DEEMPHASIZED} THEN 1 ELSE 0 END), organization, id`,
      params
    );

    const summary = await getSummary({ excludeJeen, excludeSpeakers });
    res.json({ invitees: rows.rows, summary });
  })
);

// GET /api/invitees/export — download the current list as XLSX
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM invitees ORDER BY organization, id');
    const data = rows.rows.map((r) => ({
      'משרד': r.organization,
      'שם': r.full_name || '',
      'תפקיד': r.role || '',
      'כתובת מייל': r.email || '',
      'טלפון': r.phone || '',
      'סטטוס': r.status,
      'מלווים': r.plus_ones,
      'אחראי/ת הזמנה': r.invited_by || '',
      'פנייה במייל': r.outreach_email ? 'כן' : '',
      'פנייה בוואטסאפ': r.outreach_whatsapp ? 'כן' : '',
      'פנייה בטלפון': r.outreach_call ? 'כן' : '',
      'מקור': r.source || '',
      'הערות': r.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'invitees');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="invitees.xlsx"');
    res.send(buf);
  })
);

// GET /api/invitees/survey-export — download survey responses as XLSX
router.get(
  '/survey-export',
  asyncHandler(async (req, res) => {
    const rows = await query(
      "SELECT submitted_at, full_name, organization, email, phone, attendance, survey FROM rsvp_submissions WHERE survey IS NOT NULL ORDER BY submitted_at DESC"
    );
    const attLabel = { yes: 'מגיע/ה', no: 'לא מגיע/ה', maybe: 'אולי' };
    const data = rows.rows.map((r) => {
      const s = r.survey || {};
      return {
        'תאריך': r.submitted_at ? new Date(r.submitted_at).toLocaleString('he-IL') : '',
        'שם': r.full_name || '',
        'ארגון': r.organization || '',
        'מייל': r.email || '',
        'טלפון': r.phone || '',
        'הגעה': attLabel[r.attendance] || r.attendance || '',
        'שאלה 1 — שלב השימוש': s.q1 || '',
        'שאלה 2 — היגדים': Array.isArray(s.q2) ? s.q2.join(', ') : '',
        'שאלה 3 — תקציב ICT': s.q3 || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'survey');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="survey-responses.xlsx"');
    res.send(buf);
  })
);

// POST /api/invitees — create one manually
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { organization, full_name, role, email, phone, status, plus_ones, notes, invited_by } =
      req.body || {};
    if (!organization || !String(organization).trim()) {
      return res.status(400).json({ error: 'organization is required' });
    }
    const st = VALID_STATUSES.includes(status) ? status : 'not_invited';
    const result = await query(
      `INSERT INTO invitees (organization, full_name, role, email, phone, status, plus_ones, notes, invited_by, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'manual') RETURNING *`,
      [
        String(organization).trim(),
        full_name || null,
        role || null,
        email || null,
        phone || null,
        st,
        Number.parseInt(plus_ones, 10) || 0,
        notes || null,
        invited_by || null,
      ]
    );
    res.status(201).json({ invitee: result.rows[0] });
  })
);

// Send an approval/decline email when an admin moves an invitee into a new
// status. Only fires on a genuine transition, and only to invitees with an
// email. Fire-and-forget — errors are logged, never surfaced to the admin.
function maybeSendStatusEmail(prevStatus, invitee) {
  if (!invitee || !invitee.email) return;
  const next = invitee.status;
  let msg = null;
  if (next === 'confirmed' && prevStatus !== 'confirmed') {
    msg = participationApproved({ name: invitee.full_name });
  } else if (next === 'declined' && prevStatus !== 'declined') {
    msg = participationDeclined({ name: invitee.full_name });
  }
  if (!msg) return;
  sendMail({
    to: invitee.email,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    kind: msg.kind,
    inviteeId: invitee.id,
  }).catch((e) => console.error('[invitees] status email error:', e.message));
}

// PATCH /api/invitees/:id — update status/notes/fields, re-running capacity check
// when moving someone into 'confirmed'.
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const body = req.body || {};
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return res.status(400).json({ error: 'invalid status' });
    }

    const result = await withTransaction(async (client) => {
      const current = await client.query('SELECT * FROM invitees WHERE id = $1', [id]);
      if (current.rows.length === 0) return { notFound: true };
      const inv = current.rows[0];

      const nextStatus = body.status ?? inv.status;
      const nextPlusOnes =
        body.plus_ones != null ? Math.max(0, Number.parseInt(body.plus_ones, 10) || 0) : inv.plus_ones;

      // Capacity check only when transitioning INTO confirmed (not on unrelated
      // edits to someone who's already confirmed).
      let overCapacity = false;
      if (nextStatus === 'confirmed' && inv.status !== 'confirmed') {
        const { maxAttendees, confirmedSeats } = await lockAndCount(client, { excludeInviteeId: id });
        const requestedSeats = 1 + nextPlusOnes;
        if (confirmedSeats + requestedSeats > maxAttendees) {
          overCapacity = true;
          // Block unless the admin explicitly overrides.
          if (!body.force) {
            return {
              conflict: true,
              overCapacity: true,
              maxAttendees,
              confirmedSeats,
              wouldBe: confirmedSeats + requestedSeats,
            };
          }
        }
      }

      const updated = await client.query(
        `UPDATE invitees
           SET status = $1,
               plus_ones = $2,
               notes = COALESCE($3, notes),
               full_name = COALESCE($4, full_name),
               role = COALESCE($5, role),
               email = COALESCE($6, email),
               phone = COALESCE($7, phone),
               organization = COALESCE($8, organization),
               invited_by = COALESCE($9, invited_by),
               outreach_email = COALESCE($10, outreach_email),
               outreach_whatsapp = COALESCE($11, outreach_whatsapp),
               outreach_call = COALESCE($12, outreach_call),
               updated_at = now()
         WHERE id = $13
         RETURNING *`,
        [
          nextStatus,
          nextPlusOnes,
          body.notes ?? null,
          body.full_name ?? null,
          body.role ?? null,
          body.email ?? null,
          body.phone ?? null,
          body.organization ?? null,
          body.invited_by ?? null,
          typeof body.outreach_email === 'boolean' ? body.outreach_email : null,
          typeof body.outreach_whatsapp === 'boolean' ? body.outreach_whatsapp : null,
          typeof body.outreach_call === 'boolean' ? body.outreach_call : null,
          id,
        ]
      );
      return { invitee: updated.rows[0], overCapacity, prevStatus: inv.status };
    });

    if (result.notFound) return res.status(404).json({ error: 'not found' });
    if (result.conflict) {
      return res.status(409).json({
        error: 'over_capacity',
        message: `אישור המוזמן/ת יעבור את מגבלת ה-${result.maxAttendees} משתתפים (יגיע ל-${result.wouldBe}).`,
        ...result,
      });
    }

    // Notify the invitee on a real status transition (approve / decline).
    // Fire-and-forget: never blocks or fails the admin action.
    maybeSendStatusEmail(result.prevStatus, result.invitee);

    res.json({ invitee: result.invitee, overCapacity: result.overCapacity });
  })
);

// DELETE /api/invitees/:id — permanently remove an invitee row. Child audit
// rows (rsvp_submissions, email_log) keep their history but have their FK
// nulled so the delete doesn't violate the reference constraint.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const result = await withTransaction(async (client) => {
      const existing = await client.query('SELECT id FROM invitees WHERE id = $1', [id]);
      if (existing.rows.length === 0) return { notFound: true };
      await client.query('UPDATE rsvp_submissions SET invitee_id = NULL WHERE invitee_id = $1', [id]);
      await client.query('UPDATE email_log SET invitee_id = NULL WHERE invitee_id = $1', [id]);
      await client.query('DELETE FROM invitees WHERE id = $1', [id]);
      return { deleted: true };
    });

    if (result.notFound) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  })
);

// POST /api/invitees/import — bulk import from CSV/XLSX
router.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    // Accept the original column headers (משרד / כתובת מייל) plus optional extended columns.
    const pick = (row, keys) => {
      for (const k of keys) {
        const found = Object.keys(row).find((rk) => rk.trim() === k);
        if (found && String(row[found]).trim()) return String(row[found]).trim();
      }
      return '';
    };

    let imported = 0;
    let flagged = 0;
    let lastOrg = '';
    for (const row of rows) {
      let org = pick(row, ['משרד', 'organization', 'ארגון']);
      if (org) lastOrg = org;
      else org = lastOrg;

      const emailRaw = pick(row, ['כתובת מייל', 'כתובת מיייל', 'email', 'מייל']);
      const name = pick(row, ['שם', 'full_name', 'name']);
      const role = pick(row, ['תפקיד', 'role']);
      const phone = pick(row, ['טלפון', 'phone']);

      if (!org && !emailRaw && !name) continue;

      // Parse "Name <email>" or plain email; a value with no @ is treated as a name.
      let email = null;
      let derivedName = name || null;
      let notes = null;
      const emailMatch = emailRaw.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/);
      if (emailMatch) {
        email = emailMatch[0];
        const angle = emailRaw.match(/^(.*?)<\s*[^>]+>/);
        if (angle && angle[1].trim() && !derivedName) {
          derivedName = angle[1].replace(/["',]/g, '').trim();
        }
      } else if (emailRaw) {
        // A name/note landed in the email column.
        if (!derivedName) derivedName = emailRaw;
        notes = 'יש להשלים כתובת מייל';
        flagged += 1;
      } else {
        notes = 'יש להשלים כתובת מייל';
        flagged += 1;
      }

      await query(
        `INSERT INTO invitees (organization, full_name, role, email, phone, status, notes, source)
         VALUES ($1,$2,$3,$4,$5,'not_invited',$6,'import')`,
        [org || '—', derivedName, role || null, email, phone || null, notes]
      );
      imported += 1;
    }

    res.json({ imported, flagged });
  })
);

// Derive an organization label from an email domain, dropping common suffixes
// e.g. digital.gov.il -> digital, jeen.ai -> jeen, moia.gov.il -> moia.
function orgFromEmail(email) {
  const at = email.indexOf('@');
  if (at < 0) return '—';
  let domain = email.slice(at + 1).toLowerCase().trim();
  const suffixes = ['.gov.il', '.muni.il', '.org.il', '.co.il', '.ac.il', '.ai', '.com', '.co', '.net', '.org', '.il'];
  for (const suf of suffixes) {
    if (domain.endsWith(suf)) {
      domain = domain.slice(0, -suf.length);
      break;
    }
  }
  // If anything is left with dots, keep the last label (closest to the org name).
  const parts = domain.split('.').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '—';
}

// POST /api/invitees/import-maillist — parse a pasted mailing-list string like
//   "Name" <email>; "Name2" <email2>; bare@email.com
// into invitees (name + email + org derived from the domain). Skips duplicates.
router.post(
  '/import-maillist',
  asyncHandler(async (req, res) => {
    const raw = (req.body && req.body.text) || '';
    if (!String(raw).trim()) return res.status(400).json({ error: 'text is required' });

    // Split on ; , newlines (but not inside <...>).
    const chunks = String(raw)
      .split(/[;,\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const emailRe = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
    let imported = 0;
    let skipped = 0;
    let invalid = 0;

    for (const chunk of chunks) {
      const m = chunk.match(emailRe);
      if (!m) {
        invalid += 1;
        continue;
      }
      const email = m[0];
      // Name is the part before <...>, stripped of quotes; ignore if it's the email itself.
      let name = null;
      const angle = chunk.match(/^(.*?)<\s*[^>]+>/);
      if (angle && angle[1].trim()) {
        const candidate = angle[1].replace(/["]/g, '').trim();
        if (candidate && candidate.toLowerCase() !== email.toLowerCase() && !emailRe.test(candidate)) {
          name = candidate;
        }
      }
      const org = orgFromEmail(email);

      // Skip if this email already exists (case-insensitive).
      const existing = await query('SELECT id FROM invitees WHERE LOWER(email) = LOWER($1) LIMIT 1', [
        email,
      ]);
      if (existing.rows.length) {
        skipped += 1;
        continue;
      }

      await query(
        `INSERT INTO invitees (organization, full_name, email, status, source)
         VALUES ($1,$2,$3,'not_invited','import')`,
        [org, name, email]
      );
      imported += 1;
    }

    res.json({ imported, skipped, invalid });
  })
);

// GET /api/invitees/stats/by-org — per-organization potential vs confirmed
router.get(
  '/stats/by-org',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT organization,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('confirmed','speaker'))::int AS confirmed
       FROM invitees
       GROUP BY organization
       ORDER BY total DESC, organization`
    );
    res.json({ orgs: rows.rows });
  })
);

async function getSummary({ excludeJeen = false, excludeSpeakers = false } = {}) {
  const conds = [];
  if (excludeSpeakers) conds.push("status <> 'speaker'");
  if (excludeJeen) conds.push(`NOT ${IS_JEEN}`);
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = await query(
    `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(plus_ones + 1),0)::int AS seats
     FROM invitees ${where} GROUP BY status`
  );
  const byStatus = {};
  for (const r of rows.rows) byStatus[r.status] = { count: r.count, seats: r.seats };

  // Outreach reach per channel (a person can be counted in more than one, so
  // these can sum to more than the number of invitees). Same exclusion filters.
  const outreach = await query(
    `SELECT
       COUNT(*) FILTER (WHERE outreach_email)::int    AS email,
       COUNT(*) FILTER (WHERE outreach_whatsapp)::int AS whatsapp,
       COUNT(*) FILTER (WHERE outreach_call)::int     AS call
     FROM invitees ${where}`
  );
  const o = outreach.rows[0] || { email: 0, whatsapp: 0, call: 0 };

  const settings = await query('SELECT max_attendees FROM event_settings ORDER BY id LIMIT 1');
  const maxAttendees = settings.rows[0] ? settings.rows[0].max_attendees : 120;
  // Approved seats = confirmed + speakers.
  const confirmedSeats =
    (byStatus.confirmed ? byStatus.confirmed.seats : 0) + (byStatus.speaker ? byStatus.speaker.seats : 0);
  return {
    not_invited: byStatus.not_invited ? byStatus.not_invited.count : 0,
    invited: byStatus.invited ? byStatus.invited.count : 0,
    pending: byStatus.pending ? byStatus.pending.count : 0,
    confirmed: byStatus.confirmed ? byStatus.confirmed.count : 0,
    speaker: byStatus.speaker ? byStatus.speaker.count : 0,
    maybe: byStatus.maybe ? byStatus.maybe.count : 0,
    declined: byStatus.declined ? byStatus.declined.count : 0,
    waitlist: byStatus.waitlist ? byStatus.waitlist.count : 0,
    no_response: byStatus.no_response ? byStatus.no_response.count : 0,
    total_invitees: Object.values(byStatus).reduce((a, b) => a + b.count, 0),
    outreach_email: o.email,
    outreach_whatsapp: o.whatsapp,
    outreach_call: o.call,
    confirmed_seats: confirmedSeats,
    max_attendees: maxAttendees,
  };
}

export default router;
