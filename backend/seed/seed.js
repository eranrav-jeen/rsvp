// Seeds invitees, tasks, and a couple of starter marketing text templates.
// Idempotent-ish: only seeds a table when it is currently empty, so re-running
// the deploy won't duplicate rows. Pass --force to wipe and re-seed those tables.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const force = process.argv.includes('--force');

const readJson = (name) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));

async function isEmpty(table) {
  const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
  return r.rows[0].c === 0;
}

async function seedInvitees() {
  if (force) await pool.query('TRUNCATE invitees RESTART IDENTITY CASCADE');
  else if (!(await isEmpty('invitees'))) {
    console.log('invitees not empty — skipping (use --force to reseed)');
    return;
  }
  const rows = readJson('invitees.json');
  for (const r of rows) {
    await pool.query(
      `INSERT INTO invitees (organization, full_name, role, email, phone, status, plus_ones, notes, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        r.organization,
        r.full_name,
        r.role,
        r.email,
        r.phone,
        r.status || 'not_invited',
        r.plus_ones || 0,
        r.notes,
        r.source || 'import',
      ]
    );
  }
  console.log(`Seeded ${rows.length} invitees.`);
}

async function seedTasks() {
  if (force) await pool.query('TRUNCATE tasks RESTART IDENTITY CASCADE');
  else if (!(await isEmpty('tasks'))) {
    console.log('tasks not empty — skipping (use --force to reseed)');
    return;
  }
  const rows = readJson('tasks.json');
  for (const r of rows) {
    await pool.query(
      `INSERT INTO tasks (owner, title, status, due_date, due_date_text, notes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [r.owner, r.title, r.status || 'open', r.due_date, r.due_date_text, r.notes]
    );
  }
  console.log(`Seeded ${rows.length} tasks.`);
}

async function seedMarketing() {
  if (force) await pool.query('TRUNCATE marketing_assets RESTART IDENTITY CASCADE');
  else if (!(await isEmpty('marketing_assets'))) {
    console.log('marketing_assets not empty — skipping (use --force to reseed)');
    return;
  }
  const templates = [
    {
      type: 'email_text',
      title: 'הזמנה — שליחה ראשונה',
      body:
        'נושא: הזמנה לכנס "ככה עושים AI בממשלה" | Jeen.AI\n\n' +
        'שלום רב,\n\nנשמח לארח אתכם לכנס "ככה עושים AI בממשלה" של Jeen.AI, ' +
        'שיתקיים ביום שלישי, 20.10.2026, בין 09:00 ל-13:00, ' +
        'במשרדי Jeen.AI (בגין 121, מגדלי עזריאלי שרונה, קומה 34, תל אביב).\n\n' +
        'להרשמה: [קישור לטופס ההרשמה]\n\nבברכה,\nצוות Jeen.AI',
    },
    {
      type: 'email_text',
      title: 'הזמנה — תזכורת',
      body:
        'נושא: תזכורת — כנס "ככה עושים AI בממשלה" בשבוע הבא\n\n' +
        'שלום רב,\n\nרק תזכורת קטנה לכנס שלנו ביום שלישי הקרוב, 20.10.2026, ' +
        'בשעה 09:00. מספר המקומות מוגבל — נא לאשר הגעה בקישור: [קישור לטופס ההרשמה]\n\n' +
        'נתראה,\nצוות Jeen.AI',
    },
    {
      type: 'whatsapp_text',
      title: 'וואטסאפ — קצר',
      body:
        'היי! מזמינים אתכם לכנס "ככה עושים AI בממשלה" של Jeen.AI 🚀\n' +
        '🗓️ 20.10.2026, 09:00–13:00\n📍 בגין 121, עזריאלי שרונה, קומה 34, ת"א\n' +
        'להרשמה (מקומות מוגבלים): [קישור]',
    },
  ];
  for (const t of templates) {
    await pool.query(
      `INSERT INTO marketing_assets (type, title, body, language) VALUES ($1,$2,$3,'he')`,
      [t.type, t.title, t.body]
    );
  }
  console.log(`Seeded ${templates.length} marketing templates.`);
}

async function run() {
  await seedInvitees();
  await seedTasks();
  await seedMarketing();
  await pool.end();
  console.log('Seeding complete.');
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
