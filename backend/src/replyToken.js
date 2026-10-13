import crypto from 'crypto';

// Personal, unguessable links for the reminder email's "will you attend?"
// buttons. Token = "<inviteeId>.<hmac>", signed with REPLY_SECRET (falls back to
// SESSION_SECRET), so a link only works for the invitee it was issued to.
function secret() {
  return process.env.REPLY_SECRET || process.env.SESSION_SECRET || 'dev-insecure-secret';
}

function sign(id) {
  return crypto.createHmac('sha256', secret()).update(`reply:${id}`).digest('base64url').slice(0, 22);
}

export function makeReplyToken(id) {
  return `${id}.${sign(id)}`;
}

// Returns the invitee id for a valid token, or null.
export function verifyReplyToken(token) {
  const m = /^(\d+)\.([A-Za-z0-9_-]+)$/.exec(String(token || ''));
  if (!m) return null;
  const id = Number.parseInt(m[1], 10);
  const expected = Buffer.from(sign(id));
  const got = Buffer.from(m[2]);
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return null;
  return id;
}
