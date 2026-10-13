import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// The event schedule shown on the public /agenda page. Single source of truth is
// frontend/src/agenda.json; it's read fresh on each call so an edited agenda
// shows up in emails after `git pull` without restarting the API.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENDA_PATH = path.join(__dirname, '..', '..', 'frontend', 'src', 'agenda.json');

export function getAgenda() {
  try {
    return JSON.parse(fs.readFileSync(AGENDA_PATH, 'utf8'));
  } catch (err) {
    console.error('[agenda] could not read agenda.json:', err.message);
    return [];
  }
}
