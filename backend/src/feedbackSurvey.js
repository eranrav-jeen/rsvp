import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Post-event survey definition. Single source of truth is
// frontend/src/feedbackSurvey.json (the public form renders from it too).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SURVEY_PATH = path.join(__dirname, '..', '..', 'frontend', 'src', 'feedbackSurvey.json');

export function getFeedbackSurvey() {
  return JSON.parse(fs.readFileSync(SURVEY_PATH, 'utf8'));
}

// Keep only valid answers: known options, multi-select limits, trimmed text.
// Returns { answers, missing: [keys of unanswered questions] }.
export function cleanAnswers(raw) {
  const survey = getFeedbackSurvey();
  const answers = {};
  const missing = [];
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const q of survey.questions) {
    const v = src[q.key];
    if (q.type === 'single') {
      if (q.options.includes(v)) answers[q.key] = v;
    } else if (q.type === 'multi') {
      const picked = Array.isArray(v) ? [...new Set(v.filter((x) => q.options.includes(x)))] : [];
      if (picked.length) answers[q.key] = picked.slice(0, q.max || picked.length);
      if (q.other && picked.includes(q.other) && typeof src[`${q.key}_other`] === 'string') {
        const t = src[`${q.key}_other`].trim().slice(0, 500);
        if (t) answers[`${q.key}_other`] = t;
      }
    } else if (q.type === 'text') {
      const t = typeof v === 'string' ? v.trim().slice(0, 2000) : '';
      if (t) answers[q.key] = t;
    }
    if (!(q.key in answers)) missing.push(q.key);
  }
  // "Interested in a 30-min meeting?" toggle (yes / no).
  if (survey.meeting && ['yes', 'no'].includes(src.meeting)) answers.meeting = src.meeting;
  return { answers, missing };
}
