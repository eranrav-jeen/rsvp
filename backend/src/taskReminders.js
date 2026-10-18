import { query } from './db.js';
import { sendMail } from './mailer.js';
import { taskReminder } from './emails.js';
import { ownersOf } from './team.js';

// Groups open / in-progress tasks by the team member responsible for them.
// A task with several owners ("ערן + מיטל") goes to each of them.
// Returns { people: [{ name, email, tasks }], unassigned: [tasks] }.
export async function planTaskReminders() {
  const tasks = (
    await query(
      `SELECT * FROM tasks WHERE status IN ('open', 'in_progress')
        ORDER BY due_date NULLS LAST, id`
    )
  ).rows;
  const byName = new Map();
  const unassigned = [];
  for (const t of tasks) {
    const owners = ownersOf(t.owner);
    if (!owners.length) {
      unassigned.push(t);
      continue;
    }
    for (const o of owners) {
      if (!byName.has(o.name)) byName.set(o.name, { name: o.name, email: o.email, tasks: [] });
      byName.get(o.name).tasks.push(t);
    }
  }
  return { people: [...byName.values()], unassigned };
}

// Sends each person with an email their list. `onlyTo` restricts to one
// address (testing). Returns per-person results.
export async function sendTaskReminders({ onlyTo } = {}) {
  const { people, unassigned } = await planTaskReminders();
  const results = [];
  for (const p of people) {
    if (!p.email) {
      results.push({ name: p.name, count: p.tasks.length, sent: false, reason: 'no email' });
      continue;
    }
    if (onlyTo && p.email.toLowerCase() !== onlyTo.toLowerCase()) continue;
    const msg = taskReminder({ name: p.name, tasks: p.tasks });
    const res = await sendMail({ to: p.email, ...msg });
    results.push({ name: p.name, email: p.email, count: p.tasks.length, sent: !!res.sent, reason: res.error || null });
  }
  return { results, unassignedCount: unassigned.length };
}
