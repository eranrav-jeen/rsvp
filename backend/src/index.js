import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { pool } from './db.js';
import { requireAdmin } from './middleware.js';
import authRouter from './routes/auth.js';
import rsvpRouter from './routes/rsvp.js';
import inviteesRouter from './routes/invitees.js';
import tasksRouter from './routes/tasks.js';
import marketingRouter from './routes/marketing.js';
import eventSettingsRouter from './routes/eventSettings.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1); // behind nginx
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// In dev the Vite server runs on a different port; allow it with credentials.
if (!isProd) {
  app.use(
    cors({
      origin: (origin, cb) => cb(null, true),
      credentials: true,
    })
  );
}

// Whether the session cookie is marked Secure. Defaults to on in production,
// but set COOKIE_SECURE=false when serving over plain HTTP (otherwise the
// browser drops the cookie and admin login silently fails). Flip it back to
// true once TLS is in front of the app.
const cookieSecure =
  process.env.COOKIE_SECURE != null ? process.env.COOKIE_SECURE === 'true' : isProd;

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'dev-insecure-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
      maxAge: 1000 * 60 * 60 * 12, // 12h
    },
  })
);

// Serve uploaded marketing images.
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/rsvp', rsvpRouter);

// Admin-only routes
app.use('/api/invitees', requireAdmin, inviteesRouter);
app.use('/api/tasks', requireAdmin, tasksRouter);
app.use('/api/marketing', requireAdmin, marketingRouter);
app.use('/api/event-settings', requireAdmin, eventSettingsRouter);

// Optionally serve the built frontend (when SERVE_FRONTEND=1); otherwise nginx does it.
if (process.env.SERVE_FRONTEND === '1') {
  const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(distDir));
  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// JSON error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('API error:', err.message);
  if (err.message && /only image uploads/.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'internal server error' });
});

app.listen(PORT, () => {
  console.log(`Jeen event API listening on port ${PORT} (${isProd ? 'production' : 'development'})`);
});
