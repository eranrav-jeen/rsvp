import { query } from './db.js';

// Live figures for the post-event emails: attendance and pre-survey insights
// (the opt-in survey in the registration form). Jeen staff excluded.
const NOT_JEEN = "NOT (LOWER(COALESCE(email,'')) LIKE '%@jeen.ai' OR LOWER(COALESCE(organization,'')) = 'jeen')";

export async function eventStats() {
  const a = (
    await query(
      `SELECT COUNT(*)::int AS people,
              COALESCE(SUM(COALESCE(arrived_guests, plus_ones, 0)), 0)::int AS guests,
              COUNT(DISTINCT LOWER(TRIM(organization)))::int AS orgs
         FROM invitees WHERE arrived_at IS NOT NULL AND ${NOT_JEEN}`
    )
  ).rows[0];
  // Latest survey answer per person.
  const s = (
    await query(
      `WITH latest AS (
         SELECT DISTINCT ON (COALESCE(invitee_id::text, LOWER(email))) survey
           FROM rsvp_submissions WHERE survey IS NOT NULL
          ORDER BY COALESCE(invitee_id::text, LOWER(email)), submitted_at DESC)
       SELECT COUNT(*)::int AS n,
              COUNT(*) FILTER (WHERE survey->>'q1' = 'ד')::int AS org_wide,
              COUNT(*) FILTER (WHERE survey->>'q1' IN ('א', 'ב'))::int AS early,
              COUNT(*) FILTER (WHERE survey->'q2' ? 'א')::int AS productivity,
              COUNT(*) FILTER (WHERE survey->'q2' ? 'ד')::int AS negative,
              COUNT(*) FILTER (WHERE survey->>'q3' IN ('ג', 'ד'))::int AS budget_up10
         FROM latest`
    )
  ).rows[0];
  const total = a.people + a.guests;
  const pct = (x) => (s.n ? Math.round((x / s.n) * 100) : 0);
  return {
    total,
    totalRounded: Math.floor(total / 10) * 10, // "יותר מ-80"
    orgs: a.orgs,
    survey: {
      n: s.n,
      orgWide: pct(s.org_wide),
      early: pct(s.early),
      productivity: pct(s.productivity),
      negative: pct(s.negative),
      budgetUp10: pct(s.budget_up10),
    },
  };
}
