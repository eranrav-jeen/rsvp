import express from 'express';
import { checkAdminPassword, requireAdmin } from '../middleware.js';

const router = express.Router();

// POST /api/auth/login  (public) — shared admin password
router.post('/login', (req, res) => {
  const { password, remember } = req.body || {};
  if (!checkAdminPassword(password)) {
    return res.status(401).json({ error: 'invalid password' });
  }
  req.session.isAdmin = true;
  // "Remember me": keep the session for 30 days; otherwise the default 12h.
  if (remember) {
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
  }
  res.json({ ok: true });
});

// POST /api/auth/logout  (admin)
router.post('/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// GET /api/auth/me — is the current session an admin?
router.get('/me', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

export default router;
