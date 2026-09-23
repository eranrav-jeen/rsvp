import nodemailer from 'nodemailer';
import { query } from './db.js';

// Outbound mailer. Supports two authentication modes, chosen automatically from
// the environment:
//
//   1. OAuth2 / XOAUTH2 (modern auth, app-only) — for Microsoft 365 when basic
//      SMTP AUTH is blocked by a "Block legacy authentication" Conditional
//      Access policy. Set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET plus
//      SMTP_HOST (smtp.office365.com), SMTP_USER (the sender mailbox), MAIL_FROM.
//      A client-credentials token (scope https://outlook.office365.com/.default)
//      is fetched and used as the SMTP bearer token.
//
//   2. Basic SMTP AUTH (LOGIN/PLAIN) — for SendGrid, SES, Gmail, or any SMTP
//      host. Set SMTP_HOST, SMTP_USER, SMTP_PASS (+ optional SMTP_PORT/SMTP_SECURE).
//
// If neither is configured the mailer is a no-op that logs a warning, so the app
// keeps working (RSVP + admin actions) without email delivery.

function mailMode() {
  if (
    process.env.MS_TENANT_ID &&
    process.env.MS_CLIENT_ID &&
    process.env.MS_CLIENT_SECRET &&
    process.env.SMTP_USER
  ) {
    return 'oauth';
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return 'basic';
  }
  return 'none';
}

export function isMailConfigured() {
  return mailMode() !== 'none';
}

export function mailFrom() {
  return process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@jeen.ai';
}

// --- OAuth2 (Microsoft 365) ------------------------------------------------
let cachedToken = null; // { value, exp } exp = epoch ms

async function getAccessToken() {
  if (cachedToken && cachedToken.exp - 60_000 > Date.now()) return cachedToken.value;
  const tenant = process.env.MS_TENANT_ID;
  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID,
    client_secret: process.env.MS_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'https://outlook.office365.com/.default',
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OAuth token request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text);
  cachedToken = {
    value: json.access_token,
    exp: Date.now() + (Number(json.expires_in) || 3600) * 1000,
  };
  return cachedToken.value;
}

// --- Transports ------------------------------------------------------------
let basicTransport = null;

function getBasicTransport() {
  if (basicTransport) return basicTransport;
  const host = process.env.SMTP_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
  const secure =
    process.env.SMTP_SECURE != null ? process.env.SMTP_SECURE === 'true' : port === 465;
  basicTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return basicTransport;
}

async function getOauthTransport() {
  const accessToken = await getAccessToken();
  const host = process.env.SMTP_HOST || 'smtp.office365.com';
  const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' ? true : port === 465;
  // A fresh transport per send is fine at this volume; the token is cached.
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { type: 'OAuth2', user: process.env.SMTP_USER, accessToken },
  });
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
  const mode = mailMode();
  if (mode === 'none') {
    console.warn('[mailer] not configured — set OAuth (MS_*) or SMTP_* env vars.');
    await logEmail({ inviteeId, to, kind, subject, status: 'skipped', error: 'smtp not configured' });
    return { sent: false, skipped: true, error: 'smtp not configured' };
  }

  let tx;
  try {
    tx = mode === 'oauth' ? await getOauthTransport() : getBasicTransport();
  } catch (err) {
    console.error(`[mailer] auth/token error (${kind}) to ${to}:`, err.message);
    await logEmail({ inviteeId, to, kind, subject, status: 'failed', error: err.message });
    return { sent: false, skipped: false, error: err.message };
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
