// The organizing team: who task owners are, and where to email them.
// `first` is how a person usually appears in a task's owner field (owners are
// free text like "מתן ניצן + ענבר הרבסט" or "ערן מול מיטל"). Add a missing
// email here, or on the server via TEAM_EMAILS="עודד טהורי=oded@jeen.ai;…".
const TEAM = [
  { name: 'ערן רביב', first: ['ערן'], email: 'eran@jeen.ai' },
  { name: 'מתן ניצן', first: ['מתן'], email: 'matan@jeen.ai' },
  { name: 'מיטל נועם', first: ['מיטל'], email: 'meital@jeen.ai' },
  { name: 'ענבר הרבסט', first: ['ענבר'], email: 'inbar@jeen.ai' },
  { name: 'עודד טהורי', first: ['עודד'], email: null },
  { name: 'אייל כהן', first: ['אייל'], email: null },
  { name: 'דן שקרק', first: ['דן'], email: null },
  { name: 'דור לוי', first: ['דור'], email: null },
  { name: 'לי איתן ברק', first: ['לי'], email: null },
  { name: 'יעל', first: ['יעל', 'יעלי'], email: null },
  { name: 'תומר דולב', first: ['תומר'], email: null },
];

function withEnvOverrides() {
  const team = TEAM.map((p) => ({ ...p }));
  for (const pair of String(process.env.TEAM_EMAILS || '').split(';')) {
    const [name, email] = pair.split('=').map((x) => (x || '').trim());
    if (!name || !email) continue;
    const p = team.find((t) => t.name === name || t.first.includes(name));
    if (p) p.email = email;
    else team.push({ name, first: [name.split(/\s+/)[0]], email });
  }
  return team;
}

// The team members named in an owner string (full name or first name, also
// with a Hebrew "ו" prefix, e.g. "ערן ומתן").
export function ownersOf(ownerText) {
  const text = ` ${String(ownerText || '').replace(/[+,/&()]/g, ' ')} `;
  return withEnvOverrides().filter((p) =>
    [p.name, ...p.first].some((n) => new RegExp(`\\sו?${n}(?=\\s)`).test(text))
  );
}
