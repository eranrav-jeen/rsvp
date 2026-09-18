import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { query } from '../db.js';
import { asyncHandler } from '../middleware.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('only image uploads are allowed'));
  },
});

const VALID_TYPES = ['image', 'email_text', 'whatsapp_text', 'other'];

// GET /api/marketing
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM marketing_assets ORDER BY type, created_at DESC, id DESC');
    res.json({ assets: rows.rows });
  })
);

// POST /api/marketing — create an image (multipart) or a text template (JSON)
router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { type, title, body, language } = req.body || {};
    if (!type || !VALID_TYPES.includes(type)) return res.status(400).json({ error: 'invalid type' });
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });

    let filePath = null;
    if (type === 'image') {
      if (!req.file) return res.status(400).json({ error: 'image file is required for type=image' });
      filePath = `/uploads/${req.file.filename}`;
    }

    const rows = await query(
      `INSERT INTO marketing_assets (type, title, file_path, body, language)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [type, String(title).trim(), filePath, body || null, language || 'he']
    );
    res.status(201).json({ asset: rows.rows[0] });
  })
);

// DELETE /api/marketing/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const rows = await query('DELETE FROM marketing_assets WHERE id = $1 RETURNING *', [id]);
    if (rows.rows.length === 0) return res.status(404).json({ error: 'not found' });
    // Best-effort removal of the backing file.
    const asset = rows.rows[0];
    if (asset.file_path) {
      const fname = path.basename(asset.file_path);
      fs.promises.unlink(path.join(uploadDir, fname)).catch(() => {});
    }
    res.json({ ok: true });
  })
);

export default router;
