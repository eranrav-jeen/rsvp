// Emails each team member their open / in-progress tasks (same as the
// "שליחת משימות במייל" button on the tasks page).
//
//   node scripts/send-task-reminders.js --dry-run         who would get what
//   node scripts/send-task-reminders.js --to=eran@jeen.ai  send only that person's email
//   node scripts/send-task-reminders.js                    send to everyone with an email

import { pool } from '../src/db.js';
import { planTaskReminders, sendTaskReminders } from '../src/taskReminders.js';

const args = process.argv.slice(2);
const toArg = args.find((a) => a.startsWith('--to='));

async function main() {
  if (args.includes('--dry-run')) {
    const { people, unassigned } = await planTaskReminders();
    for (const p of people) console.log(`  ${p.name} <${p.email || 'אין מייל'}>: ${p.tasks.length} משימות`);
    console.log(`  ללא אחראי מזוהה: ${unassigned.length}`);
    return;
  }
  const { results, unassignedCount } = await sendTaskReminders({ onlyTo: toArg ? toArg.slice(5) : undefined });
  for (const r of results) console.log(`  ${r.sent ? '✓' : '✗'} ${r.name} (${r.count})${r.reason ? ` — ${r.reason}` : ''}`);
  console.log(`[tasks] done. ${unassignedCount} task(s) have no recognised owner.`);
}

main()
  .catch((e) => {
    console.error('[tasks] error:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
