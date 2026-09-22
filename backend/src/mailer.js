import nodemailer from 'nodemailer';
import { query } from './db.js';

// Provider-agnostic SMTP mailer. Configure with env vars:
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE (true for port 465),
//   SMTP_USER, SMTP_PASS, MAIL_FROM (e.g. "Jeen.ai <events@jeen.ai>").
// If SMTP is not configured the mailer becomes a no-op that logs a warning, so
// the app keeps working (RSVP + admin actions) without email delivery.

let transporter = null;
let configChecked = false;
let configured = false;

function getTransporter() {
  if (configChecked) return transporter;
  configChecked = true;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn(
      '[mailer] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing) — outbound emails are disabled.'
    );
    configured = false;
    return null;
  }

  const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
  const secure =
    process.env.SMTP_SECURE != null ? process.env.SMTP_SECURE === 'true' : port === 465;

  transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  configured = true;
  return transporter;
}

export function mailFrom() {
  return process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@jeen.ai';
}

export function isMailConfigured() {
  getTransporter();
  return configured;
}

async function logEmail({ inviteeId, to, kind, subject, status, error }) {
  try {
    await query(
      `INSERT INTO email_log (invitee_id, recipient, kind, subject, status, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [inviteeId ?? null, to, kind, subject, status, error ? String(error).slice(0, 500) : null]
    );
  } catch (e) {
    console.error('[mailer] failed to write email_log:', e.message);
  }
}

// Send one email. Never throws — returns { sent, skipped, error }. Records every
// attempt (including skips and failures) in email_log for an audit trail.
export async function sendMail({ to, subject, html, text, kind = 'other', inviteeId = null }) {
  if (!to || !String(to).trim()) {
    await logEmail({ inviteeId, to: '', kind, subject, status: 'skipped', error: 'no recipient' });
    return { sent: false, skipped: true, error: 'no recipient' };
  }
  const tx = getTransporter();
  if (!tx) {
    await logEmail({ inviteeId, to, kind, subject, status: 'skipped', error: 'smtp not configured' });
    return { sent: false, skipped: true, error: 'smtp not configured' };
  }
  try {
    await tx.sendMail({ from: mailFrom(), to, subject, html, text });
    await logEmail({ inviteeId, to, kind, subject, status: 'sent' });
    return { sent: true, skipped: false };
  } catch (err) {
    console.error(`[mailer] send failed (${kind}) to ${to}:`, err.message);
    await logEmail({ inviteeId, to, kind, subject, status: 'failed', error: err.message });
    return { sent: false, skipped: false, error: err.message };
  }
}
