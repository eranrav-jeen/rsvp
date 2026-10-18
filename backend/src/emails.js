import { EVENT, calendarUrl, outlookCalendarUrl, icsUrl, SITE_URL } from './event.js';

// Hebrew / RTL transactional email templates. Each builder returns
// { subject, html, text, kind }. Keep the HTML inline-styled and simple so it
// renders well across mail clients (Gmail, Outlook, Apple Mail).

const BRAND = {
  maroon: '#3d0f2e',
  coral: '#f05a28',
  amber: '#f6a93c',
  cream: '#fbf3ec',
  text: '#2b2b2b',
};

function firstName(name) {
  const n = (name || '').trim();
  return n ? n.split(/\s+/)[0] : '';
}

function hello(name) {
  const f = firstName(name);
  return f ? `שלום ${f},` : 'שלום,';
}

// Add-to-calendar buttons for the major clients.
function calendarCtas() {
  return [
    { href: calendarUrl(), label: 'Google Calendar' },
    { href: outlookCalendarUrl(), label: 'Outlook' },
    { href: icsUrl(), label: 'Apple / אחר (ICS)' },
  ];
}

function button(cta, i) {
  const style =
    i === 0
      ? `background:${BRAND.coral};color:#fff;`
      : `background:#fff;color:${BRAND.coral};border:1.5px solid ${BRAND.coral};`;
  return `<a href="${cta.href}" target="_blank"
     style="display:inline-block;${style}text-decoration:none;font-weight:700;font-size:15px;
            padding:10px 16px;border-radius:10px;margin:4px 6px 4px 0;">${cta.label}</a>`;
}

// `ctas` is an array of { href, label }. The first renders filled, the rest outlined.
function layout({ heading, accent, bodyHtml, ctas }) {
  const ctaHtml =
    ctas && ctas.length
      ? `<tr><td style="padding:8px 0 4px;">${ctas.map(button).join('')}</td></tr>`
      : '';

  return `<!doctype html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;
                    font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;direction:rtl;text-align:right;">
        <tr>
          <td style="background:${BRAND.maroon};color:${BRAND.cream};padding:26px 28px;text-align:center;">
            <div style="font-size:22px;font-weight:800;letter-spacing:.5px;color:#fff;">Jeen.ai</div>
            <div style="font-size:20px;font-weight:800;margin-top:10px;color:#fff;">${EVENT.title}</div>
            <div style="font-size:16px;font-weight:700;margin-top:2px;color:${BRAND.amber};">${EVENT.subtitle}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 28px;color:${BRAND.text};font-size:16px;line-height:1.6;">
            <h1 style="margin:0 0 12px;font-size:22px;color:${accent || BRAND.maroon};">${heading}</h1>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              ${bodyHtml}
              ${ctaHtml}
            </table>
            <div style="margin-top:22px;padding-top:16px;border-top:1px solid #eee;color:#555;font-size:14px;line-height:1.7;">
              <div><strong>מתי:</strong> ${EVENT.dateLabel}</div>
              <div><strong>איפה:</strong> ${EVENT.place}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:${BRAND.cream};padding:16px 28px;color:#7a7a7a;font-size:12px;text-align:center;">
            הודעה זו נשלחה אוטומטית ממערכת ההרשמה לכנס של Jeen.ai.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function p(html) {
  return `<tr><td style="padding:0 0 12px;">${html}</td></tr>`;
}

function textFooter() {
  return `\n\nמתי: ${EVENT.dateLabel}\nאיפה: ${EVENT.place}\n\n— מערכת ההרשמה של Jeen.ai`;
}

// Acknowledgement sent immediately after someone submits the RSVP form. The
// wording depends on the resulting status.
export function registrationReceived({ name, status }) {
  const greet = hello(name);

  if (status === 'confirmed' || status === 'speaker') {
    return {
      kind: 'registration_confirmed',
      subject: `אישור הרשמה · ${EVENT.title} ${EVENT.subtitle}`,
      html: layout({
        heading: 'ההרשמה שלך אושרה! 🎉',
        bodyHtml:
          p(`${greet}`) +
          p('שמחים לאשר את השתתפותך בכנס. שמרנו לך מקום — נשמח לראותך!') +
          p('בחרו את היומן שלכם והוסיפו את האירוע:'),
        ctas: calendarCtas(),
      }),
      text: `${greet}\n\nההרשמה שלך אושרה! שמרנו לך מקום ונשמח לראותך.\nהוספה ליומן — Google: ${calendarUrl()}\nOutlook: ${outlookCalendarUrl()}\nApple / אחר (ICS): ${icsUrl()}${textFooter()}`,
    };
  }

  if (status === 'pending') {
    return {
      kind: 'registration_pending',
      subject: `בקשת ההרשמה שלך התקבלה · ${EVENT.title}`,
      html: layout({
        heading: 'בקשת ההרשמה שלך התקבלה 📝',
        bodyHtml:
          p(`${greet}`) +
          p('תודה על ההרשמה לכנס! ההשתתפות מותנית באישור מראש בשל מספר המקומות המוגבל.') +
          p('נבחן את הבקשה ונעדכן אותך במייל בהקדם — אין צורך לעשות דבר בשלב זה.'),
      }),
      text: `${greet}\n\nתודה על ההרשמה! ההשתתפות מותנית באישור מראש. נעדכן אותך במייל בהקדם.${textFooter()}`,
    };
  }

  if (status === 'waitlist') {
    return {
      kind: 'registration_waitlist',
      subject: `נרשמת לרשימת ההמתנה · ${EVENT.title}`,
      html: layout({
        heading: 'נרשמת לרשימת ההמתנה ⏳',
        accent: BRAND.amber,
        bodyHtml:
          p(`${greet}`) +
          p('הכנס מלא כרגע ונרשמת לרשימת ההמתנה. אם יתפנה מקום, ניצור איתך קשר מיד.') +
          p('תודה על ההתעניינות!'),
      }),
      text: `${greet}\n\nהכנס מלא כרגע ונרשמת לרשימת ההמתנה. אם יתפנה מקום ניצור איתך קשר.${textFooter()}`,
    };
  }

  if (status === 'maybe') {
    return {
      kind: 'registration_maybe',
      subject: `רשמנו את תשובתך · ${EVENT.title}`,
      html: layout({
        heading: 'תודה! רשמנו "אולי" 🤔',
        bodyHtml:
          p(`${greet}`) +
          p('רשמנו שאתם עדיין לא בטוחים. נשמח אם תעדכנו אותנו ברגע שתדעו — נשמור מקום בינתיים.') +
          p('החלטתם שאתם מגיעים? אפשר להגיש בקשת הרשמה כאן:'),
        ctas: [{ href: SITE_URL, label: 'הרשמה לכנס' }],
      }),
      text: `${greet}\n\nרשמנו "אולי". נשמח אם תעדכנו אותנו ברגע שתדעו.\nהחלטתם להגיע? הרשמה כאן: ${SITE_URL}${textFooter()}`,
    };
  }

  // declined via the form
  return {
    kind: 'registration_declined',
    subject: `תודה על העדכון · ${EVENT.title}`,
    html: layout({
      heading: 'תודה שעדכנתם אותנו 🙏',
      bodyHtml:
        p(`${greet}`) +
        p('חבל שלא תוכלו להגיע הפעם — נשמח לראותכם באירוע הבא.') +
        p('שינית/ה את דעתך ורוצה להצטרף בכל זאת? אפשר להגיש בקשת הרשמה כאן:'),
      ctas: [{ href: SITE_URL, label: 'הרשמה לכנס' }],
    }),
    text: `${greet}\n\nתודה שעדכנתם אותנו. נשמח לראותכם באירוע הבא.\nשינית/ה את דעתך? הרשמה כאן: ${SITE_URL}${textFooter()}`,
  };
}

// Sent when an admin approves a pending registration (pending → confirmed).
export function participationApproved({ name }) {
  const greet = hello(name);
  return {
    kind: 'approved',
    subject: `השתתפותך אושרה · ${EVENT.title} ${EVENT.subtitle}`,
    html: layout({
      heading: 'השתתפותך בכנס אושרה! 🎉',
      bodyHtml:
        p(`${greet}`) +
        p('בדקנו את בקשתך ושמחים לאשר את השתתפותך בכנס. שמרנו לך מקום!') +
        p('בחרו את היומן שלכם והוסיפו את האירוע:'),
      ctas: calendarCtas(),
    }),
    text: `${greet}\n\nהשתתפותך בכנס אושרה! שמרנו לך מקום.\nהוספה ליומן — Google: ${calendarUrl()}\nOutlook: ${outlookCalendarUrl()}\nApple / אחר (ICS): ${icsUrl()}${textFooter()}`,
  };
}

// Sent when an admin declines a registration (→ declined).
export function participationDeclined({ name }) {
  const greet = hello(name);
  return {
    kind: 'declined',
    subject: `עדכון בנוגע לבקשת ההרשמה · ${EVENT.title}`,
    html: layout({
      heading: 'עדכון בנוגע לבקשת ההרשמה',
      accent: BRAND.maroon,
      bodyHtml:
        p(`${greet}`) +
        p('תודה על ההתעניינות בכנס. לצערנו, בשל מספר המקומות המוגבל לא נוכל לאשר את השתתפותך הפעם.') +
        p('נשמח לראותך באירועים הבאים שלנו — תודה על ההבנה.'),
    }),
    text: `${greet}\n\nתודה על ההתעניינות. לצערנו בשל מספר המקומות המוגבל לא נוכל לאשר את השתתפותך הפעם. נשמח לראותך באירועים הבאים.${textFooter()}`,
  };
}

function spotlightHtml(changes) {
  if (!changes) return '';
  if (changes.isFirst) {
    return `<tr><td style="padding:6px 0 12px;">
        <div style="background:${BRAND.cream};border-radius:10px;padding:10px 12px;color:#666;font-size:14px;">
          🔦 זהו העדכון הראשון — מהעדכון הבא יופיע כאן ריכוז השינויים.
        </div></td></tr>`;
  }
  const deltas = (changes.deltas || []).length
    ? `<ul style="margin:0;padding-inline-start:18px;">${changes.deltas
        .map((d) => `<li>${d}</li>`)
        .join('')}</ul>`
    : '<div style="color:#777;">אין שינוי במספרים.</div>';
  const responders = (changes.newResponders || []).length
    ? `<div style="margin-top:8px;font-weight:700;color:${BRAND.maroon};">רשומות חדשות (${changes.newCount}):</div>
       <ul style="margin:4px 0 0;padding-inline-start:18px;">${changes.newResponders
         .map((r) => `<li>${r}</li>`)
         .join('')}</ul>`
    : '';
  return `<tr><td style="padding:6px 0 12px;">
      <div style="background:#fff7f2;border:1px solid #f3c2b3;border-radius:10px;padding:12px 14px;">
        <div style="font-weight:800;color:${BRAND.coral};margin-bottom:6px;">🔦 מה השתנה מאז ${changes.sinceLabel}</div>
        <div style="font-size:14px;color:${BRAND.text};line-height:1.75;">${deltas}${responders}</div>
      </div>
    </td></tr>`;
}

// Internal daily status digest (registration status + action recommendations).
// Email-client safe: table layout + inline styles only.
// Attendance goal the headline is measured against (override with DIGEST_TARGET).
const DIGEST_TARGET = Number(process.env.DIGEST_TARGET) || 80;

function digestHeadline(confirmed, invited) {
  const pct = Math.round((confirmed / DIGEST_TARGET) * 100);
  const invitedPct = invited > 0 ? Math.round((confirmed / invited) * 100) : 0;
  return `<tr><td style="padding:4px 0 16px;">
      <div style="background:${BRAND.maroon};border-radius:14px;padding:18px 16px;text-align:center;color:#fff;">
        <div style="font-size:14px;color:${BRAND.amber};font-weight:700;">🎯 אישרו הגעה (כולל מרצים) מתוך היעד</div>
        <div style="font-size:44px;font-weight:800;line-height:1.15;margin-top:4px;direction:ltr;">
          ${confirmed} <span style="color:${BRAND.amber};font-weight:700;">/</span> ${DIGEST_TARGET}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="margin-top:10px;background:rgba(255,255,255,.18);border-radius:6px;">
          <tr><td style="height:8px;line-height:8px;font-size:0;border-radius:6px;
                         background:${BRAND.amber};width:${Math.min(100, Math.max(pct, 1))}%;">&nbsp;</td>
              <td style="font-size:0;line-height:8px;">&nbsp;</td></tr>
        </table>
        <div style="font-size:15px;font-weight:700;margin-top:6px;color:#fff;">${pct}% מהיעד</div>
        <div style="font-size:13px;margin-top:4px;color:${BRAND.cream};opacity:.85;">
          מתוך ${invited} מוזמנים · ${invitedPct}%
        </div>
      </div>
    </td></tr>`;
}

function statGroup(title, rows) {
  const body = rows
    .map(
      ([icon, label, val], i) =>
        `<tr>
          <td style="padding:8px 12px;width:28px;font-size:18px;${i ? 'border-top:1px solid #f1e6dc;' : ''}">${icon}</td>
          <td style="padding:8px 0;color:#444;font-size:15px;${i ? 'border-top:1px solid #f1e6dc;' : ''}">${label}</td>
          <td style="padding:8px 14px;font-weight:800;font-size:17px;color:${BRAND.maroon};text-align:left;${i ? 'border-top:1px solid #f1e6dc;' : ''}">${val}</td>
        </tr>`
    )
    .join('');
  return `<tr><td style="padding:0 0 14px;">
      <div style="font-weight:800;color:${BRAND.maroon};font-size:16px;margin:0 2px 6px;">${title}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:${BRAND.cream};border-radius:12px;">${body}</table>
    </td></tr>`;
}

function seatsBar(used, max) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct >= 100 ? BRAND.coral : BRAND.amber;
  return `<tr><td style="padding:0 0 14px;">
      <div style="font-weight:800;color:${BRAND.maroon};font-size:16px;margin:0 2px 6px;">🪑 תפוסת מקומות</div>
      <div style="background:${BRAND.cream};border-radius:12px;padding:12px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="color:#444;font-size:15px;">מקומות מאושרים (כולל מלווים) מול מכסה</td>
          <td style="font-weight:800;font-size:17px;color:${BRAND.maroon};text-align:left;direction:ltr;">${used} / ${max}</td>
        </tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="margin-top:8px;background:#ead9cb;border-radius:6px;">
          <tr><td style="height:8px;line-height:8px;font-size:0;border-radius:6px;background:${color};width:${Math.max(pct, 1)}%;">&nbsp;</td>
              <td style="font-size:0;line-height:8px;">&nbsp;</td></tr>
        </table>
      </div>
    </td></tr>`;
}

export function dailyDigest({ dateLabel, daysToEvent, stats, recommendations, changes }) {
  const s = stats;
  // Headline: confirmed attendees (incl. speakers) out of everyone invited so far.
  const attending = s.confirmed + s.speaker;
  const invitedCount = s.total - s.not_invited;
  const v = s.validation || {};
  const statsHtml =
    statGroup('📞 אישורי הגעה (מבין המאושרים)', [
      ['✅', 'אישרו הגעה', v.confirmed || 0],
      ['🤔', 'עוד לא בטוחים', v.unsure || 0],
      ['❌', 'לא מגיעים', v.declined || 0],
      ['📵', 'אין מענה', v.no_answer || 0],
      ['🔁', 'לחזור אליהם', v.callback || 0],
      ['⏳', 'טרם אומתו', v.pending || 0],
    ]) +
    statGroup('✅ הרשמות', [
      ['✅', 'אושרה השתתפות', s.confirmed],
      ['🎤', 'מרצים/ות', s.speaker],
      ['⏳', 'ממתינים לאישור', s.pending],
      ['📋', 'רשימת המתנה', s.waitlist],
    ]) +
    statGroup('💬 תשובות פתוחות', [
      ['📭', 'הוזמנו (טרם השיבו)', s.invited],
      ['🤔', 'אולי', s.maybe],
      ['❌', 'סימנו שלא יגיעו', s.declined],
      ...(s.no_response ? [['🔕', 'לא הגיבו', s.no_response]] : []),
    ]) +
    statGroup('📨 הזמנות ופנייה', [
      ['👥', 'מספר מוזמנים פוטנציאלי', s.total],
      ['🆕', 'טרם הוזמנו', s.not_invited],
      ['✉️', 'הוזמנו במייל', s.outreach_email],
      ['⚠️', 'ללא כתובת מייל', s.noEmail],
    ]) +
    (s.reminder && s.reminder.sent > 0
      ? statGroup('📩 תזכורת שבוע לפני', [
          ['📨', 'נשלחה ל', s.reminder.sent],
          ['✅', 'אישרו הגעה', s.reminder.yes],
          ['🤔', 'עוד לא בטוחים', s.reminder.unsure],
          ['❌', 'ביטלו', s.reminder.no],
          ['⏳', 'טרם השיבו', Math.max(0, s.reminder.sent - s.reminder.yes - s.reminder.unsure - s.reminder.no)],
        ])
      : '') +
    seatsBar(s.confirmed_seats, s.max_attendees);
  const recsHtml = recommendations.length
    ? `<tr><td style="padding:2px 0 0;">
         <div style="font-weight:800;color:${BRAND.maroon};font-size:16px;margin:0 2px 6px;">💡 המלצות לפעולה</div>
         <div style="border:1px solid #f1e6dc;border-radius:12px;padding:10px 14px;">
           <ul style="margin:0;padding-inline-start:18px;color:${BRAND.text};font-size:15px;line-height:1.75;">
             ${recommendations.map((r) => `<li>${r}</li>`).join('')}
           </ul>
         </div>
       </td></tr>`
    : '';
  return {
    kind: 'daily_digest',
    subject: `אישורי הגעה · ${dateLabel} · ${v.confirmed || 0} אישרו, ${v.pending || 0} טרם אומתו (${attending}/${DIGEST_TARGET} מהיעד)`,
    html: layout({
      heading: `סטטוס הרשמה · ${dateLabel}`,
      bodyHtml:
        digestHeadline(attending, invitedCount) +
        p(`⏰ נותרו <b>${daysToEvent}</b> ימים לכנס.`) +
        spotlightHtml(changes) +
        statsHtml +
        recsHtml,
      ctas: [{ href: `${SITE_URL}/admin/invitees`, label: 'פתיחת לוח הבקרה' }],
    }),
    text:
      `סטטוס הרשמה · ${dateLabel}\nנותרו ${daysToEvent} ימים לכנס.\n\n` +
      `אישרו הגעה (כולל מרצים) מתוך היעד: ${attending} / ${DIGEST_TARGET}\n` +
      `מתוך ${invitedCount} מוזמנים\n\n` +
      (changes
        ? (changes.isFirst
            ? 'מה השתנה: זהו העדכון הראשון.\n\n'
            : `מה השתנה מאז ${changes.sinceLabel}:\n` +
              ((changes.deltas || []).length
                ? changes.deltas.map((d) => `- ${d}`).join('\n')
                : '- אין שינוי במספרים.') +
              ((changes.newResponders || []).length
                ? `\nרשומות חדשות (${changes.newCount}):\n` +
                  changes.newResponders.map((r) => `- ${r}`).join('\n')
                : '') +
              '\n\n')
        : '') +
      `אישורי הגעה — אישרו: ${v.confirmed || 0} · עוד לא בטוחים: ${v.unsure || 0} · לא מגיעים: ${v.declined || 0} · ` +
      `אין מענה: ${v.no_answer || 0} · לחזור: ${v.callback || 0} · טרם אומתו: ${v.pending || 0}\n` +
      `פוטנציאל: ${s.total} · טרם הוזמנו: ${s.not_invited} · הוזמנו: ${s.invited} · ` +
      `ממתינים: ${s.pending} · אושרו: ${s.confirmed} · אולי: ${s.maybe} · לא יגיעו: ${s.declined}\n` +
      `מקומות מאושרים: ${s.confirmed_seats}/${s.max_attendees} · הוזמנו במייל: ${s.outreach_email}\n\n` +
      `המלצות לפעולה:\n${recommendations.map((r) => `- ${r}`).join('\n')}`,
  };
}

// The organizing team (daily digest + reply notices). DIGEST_RECIPIENTS overrides.
export function teamRecipients() {
  return process.env.DIGEST_RECIPIENTS || 'meital@jeen.ai, matan@jeen.ai, inbar@jeen.ai, eran@jeen.ai';
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// The agenda as an email-safe table (mirrors the public /agenda page).
function agendaHtml(schedule) {
  const rows = schedule
    .map((item, i) => {
      const pause = item.kind === 'pause';
      const people = (item.people || [])
        .map(
          (pp) =>
            `<div style="font-size:13px;color:#555;line-height:1.5;margin-top:3px;">• <b style="color:${BRAND.text};">${esc(
              pp.name
            )}</b> · ${esc(pp.role)}</div>`
        )
        .join('');
      return `<tr>
        <td style="padding:10px 12px;vertical-align:top;width:52px;font-weight:800;font-size:15px;color:${
          pause ? '#8a7a83' : BRAND.maroon
        };${i ? 'border-top:1px solid #f1e6dc;' : ''}direction:ltr;text-align:right;">${esc(item.time)}</td>
        <td style="padding:10px 12px 10px 0;vertical-align:top;${i ? 'border-top:1px solid #f1e6dc;' : ''}">
          <div style="font-weight:${pause ? 600 : 800};font-size:15px;color:${pause ? '#6b5b64' : BRAND.text};line-height:1.4;">${esc(
            item.title
          )}</div>
          ${item.desc ? `<div style="font-size:13px;color:#666;line-height:1.5;margin-top:2px;">${esc(item.desc)}</div>` : ''}
          ${item.hosts ? `<div style="font-size:13px;color:${BRAND.maroon};font-weight:700;margin-top:4px;">${esc(item.hosts)}</div>` : ''}
          ${people}
        </td>
      </tr>`;
    })
    .join('');
  return `<tr><td style="padding:8px 0 4px;">
      <div style="font-weight:800;color:${BRAND.maroon};font-size:17px;margin:0 2px 8px;">🗓️ סדר היום</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:${BRAND.cream};border-radius:12px;">${rows}</table>
    </td></tr>`;
}

function agendaText(schedule) {
  return schedule
    .map((it) => {
      let line = `${it.time}  ${it.title}${it.desc ? ` — ${it.desc}` : ''}`;
      if (it.hosts) line += `\n       ${it.hosts}`;
      for (const pp of it.people || []) line += `\n       • ${pp.name}, ${pp.role}`;
      return line;
    })
    .join('\n');
}

// "בעוד שבוע" / "בעוד 5 ימים" / "מחר" — days from today (Israel time) to the event.
function daysToEventIL(now = new Date()) {
  const il = new Date(now.getTime() + 3 * 3600 * 1000); // Israel is UTC+3 through the event
  const today = Date.UTC(il.getUTCFullYear(), il.getUTCMonth(), il.getUTCDate());
  const m = /^(\d{4})(\d{2})(\d{2})T/.exec(EVENT.startUtc);
  const eventDay = m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : today;
  return Math.max(0, Math.round((eventDay - today) / 86400000));
}

function whenPhrase(days) {
  if (days <= 0) return 'היום';
  if (days === 1) return 'מחר';
  if (days === 2) return 'בעוד יומיים';
  if (days === 7) return 'בעוד שבוע';
  return `בעוד ${days} ימים`;
}

// The three answer buttons, stacked (reads well on phones and in Outlook).
function answerButtons(links) {
  const btn = (href, label, bg, fg, border) =>
    `<tr><td style="padding:0 0 10px;">
       <a href="${href}" target="_blank"
          style="display:block;background:${bg};color:${fg};border:2px solid ${border};text-decoration:none;
                 font-weight:800;font-size:17px;padding:13px 16px;border-radius:12px;text-align:center;">${label}</a>
     </td></tr>`;
  return `<tr><td style="padding:6px 0 10px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${btn(links.yes, '✅ כן, אני מגיע/ה', '#2e9e6b', '#fff', '#2e9e6b')}
        ${btn(links.unsure, '🤔 עוד לא בטוח/ה', '#fff', '#9a6a00', BRAND.amber)}
        ${btn(links.no, '❌ לצערי לא אוכל להגיע', '#fff', '#c0392b', '#e6b3ad')}
      </table>
    </td></tr>`;
}

// One-week reminder to confirmed participants, asking them to (re)confirm.
// `replyUrl` is the personal /reply/<token> page; `schedule` is the agenda.
export function attendanceReminder({ name, replyUrl, schedule }) {
  const greet = hello(name);
  const when = whenPhrase(daysToEventIL());
  const links = {
    yes: `${replyUrl}?a=yes`,
    unsure: `${replyUrl}?a=unsure`,
    no: `${replyUrl}?a=no`,
  };
  const registerUrl = `${SITE_URL}/rsvp`;
  const shareHtml = `<tr><td style="padding:16px 0 0;">
      <div style="border:1px dashed ${BRAND.amber};border-radius:12px;padding:12px 14px;background:#fffaf2;">
        <div style="font-weight:800;color:${BRAND.maroon};margin-bottom:4px;">👥 מכירים עוד מישהו שכדאי שיגיע?</div>
        <div style="font-size:14px;color:${BRAND.text};line-height:1.6;">
          מוזמנים להעביר לקולגות את קישור ההרשמה:
          <a href="${registerUrl}" target="_blank" style="color:${BRAND.coral};font-weight:700;">${registerUrl}</a>
        </div>
      </div>
    </td></tr>`;
  return {
    kind: 'reminder',
    subject: `נתראה ${when}? · ${EVENT.title} · 20.10`,
    html: layout({
      heading: `נתראה ${when}? 👋`,
      bodyHtml:
        p(greet) +
        p(
          `${when} נפגשים בכנס <b>${esc(EVENT.title)}</b>. ` +
            'כדי שנוכל להיערך (ולתת את המקום למישהו מרשימת ההמתנה במידת הצורך), נשמח לאישור קצר — לחיצה אחת:'
        ) +
        answerButtons(links) +
        p('<span style="font-size:13px;color:#777;">אפשר לשנות את התשובה בכל עת דרך אותם כפתורים.</span>') +
        agendaHtml(schedule) +
        shareHtml +
        p('<span style="display:block;margin-top:14px;">רוצים להוסיף ליומן?</span>'),
      ctas: calendarCtas(),
    }),
    text:
      `${greet}\n\n${when} נפגשים בכנס ${EVENT.title}. נשמח לאישור קצר:\n` +
      `✅ מגיע/ה: ${links.yes}\n🤔 עוד לא בטוח/ה: ${links.unsure}\n❌ לא אוכל להגיע: ${links.no}\n\n` +
      `סדר היום:\n${agendaText(schedule)}\n\n` +
      `מכירים עוד מישהו שכדאי שיגיע? קישור ההרשמה: ${registerUrl}\n\n` +
      `הוספה ליומן — Google: ${calendarUrl()}\nOutlook: ${outlookCalendarUrl()}\nApple / אחר (ICS): ${icsUrl()}${textFooter()}`,
  };
}

// Internal notice to the team when a reminder reply frees (or re-takes) a seat.
export function replyTeamNotice({ name, organization, email, phone, cancelled }) {
  const who = `${name || '—'}${organization ? ` · ${organization}` : ''}`;
  const contact = [email, phone].filter(Boolean).join(' · ');
  const heading = cancelled ? '❌ ביטול הגעה — התפנה מקום' : '✅ חזר/ה בו/ה מהביטול — מגיע/ה';
  const line = cancelled
    ? 'השיב/ה לתזכורת שלא יוכל/תוכל להגיע. הסטטוס עודכן אוטומטית ל"לא מגיע/ה" — אפשר להציע את המקום לרשימת ההמתנה.'
    : 'ביטל/ה קודם דרך התזכורת וכעת אישר/ה הגעה. הסטטוס הוחזר אוטומטית ל"מאושר/ת".';
  return {
    kind: 'reply_notice',
    subject: `${cancelled ? 'ביטול הגעה' : 'חזרה מביטול'}: ${name || '—'}${organization ? ` (${organization})` : ''}`,
    html: layout({
      heading,
      accent: cancelled ? '#c0392b' : '#2e9e6b',
      bodyHtml:
        p(`<b>${esc(who)}</b>${contact ? `<br><span style="color:#666;font-size:14px;">${esc(contact)}</span>` : ''}`) +
        p(line),
      ctas: [{ href: `${SITE_URL}/admin/invitees`, label: 'פתיחת לוח הבקרה' }],
    }),
    text: `${heading}\n\n${who}\n${contact}\n\n${line}\n${SITE_URL}/admin/invitees`,
  };
}

// "Last call" to people who were invited but haven't registered (invited /
// no_response) or answered "maybe". One main button to the registration form —
// the normal approval / capacity flow applies — plus the agenda and a share link.
export function lastCallInvite({ name, status, schedule }) {
  const greet = hello(name);
  const when = whenPhrase(daysToEventIL());
  const registerUrl = `${SITE_URL}/rsvp`;
  const opener =
    status === 'maybe'
      ? `סימנת שאולי תצטרף/י אלינו — ${when} זה קורה, ונשארו מקומות אחרונים.`
      : `${when} נפגשים בכנס <b>${esc(EVENT.title)}</b>, ונשארו מקומות אחרונים.`;
  const bigButton = `<tr><td style="padding:6px 0 14px;">
      <a href="${registerUrl}" target="_blank"
         style="display:block;background:${BRAND.coral};color:#fff;text-decoration:none;font-weight:800;
                font-size:18px;padding:14px 16px;border-radius:12px;text-align:center;">להרשמה לכנס ←</a>
    </td></tr>`;
  const shareHtml = `<tr><td style="padding:16px 0 0;">
      <div style="border:1px dashed ${BRAND.amber};border-radius:12px;padding:12px 14px;background:#fffaf2;">
        <div style="font-weight:800;color:${BRAND.maroon};margin-bottom:4px;">👥 מכירים עוד מישהו שכדאי שיגיע?</div>
        <div style="font-size:14px;color:${BRAND.text};line-height:1.6;">
          מוזמנים להעביר לקולגות את קישור ההרשמה:
          <a href="${registerUrl}" target="_blank" style="color:${BRAND.coral};font-weight:700;">${registerUrl}</a>
        </div>
      </div>
    </td></tr>`;
  return {
    kind: 'last_call',
    subject: `מקומות אחרונים · ${EVENT.title} · 20.10`,
    html: layout({
      heading: 'מקומות אחרונים לכנס ⏳',
      bodyHtml:
        p(greet) +
        p(opener) +
        p('מנהלים ומנהלות מהמגזר הציבורי ישתפו איך עוברים מפיילוטים להטמעת AI ארגונית — מאובטחת, בהיקף ובסביבות רגישות. ההרשמה לוקחת דקה:') +
        bigButton +
        agendaHtml(schedule) +
        shareHtml,
    }),
    text:
      `${greet}\n\n${opener.replace(/<[^>]+>/g, '')}\n\nלהרשמה: ${registerUrl}\n\n` +
      `סדר היום:\n${agendaText(schedule)}\n\n` +
      `מכירים עוד מישהו שכדאי שיגיע? קישור ההרשמה: ${registerUrl}${textFooter()}`,
  };
}

// Personal reminder of a team member's open / in-progress tasks.
export function taskReminder({ name, tasks }) {
  const greet = hello(name);
  const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10); // Israel date
  const fmt = (d) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
    return m ? `${m[3]}/${m[2]}` : '';
  };
  const statusLabel = { open: 'פתוחה', in_progress: 'בתהליך' };
  const rows = tasks
    .map((t, i) => {
      const due = t.due_date ? fmt(t.due_date) : t.due_date_text || '';
      const late = t.due_date && String(t.due_date).slice(0, 10) < today;
      const border = i ? 'border-top:1px solid #f1e6dc;' : '';
      return `<tr>
        <td style="padding:10px 12px;vertical-align:top;${border}">
          <div style="font-weight:700;color:${BRAND.text};font-size:15px;line-height:1.45;">${esc(t.title)}</div>
          ${t.notes ? `<div style="font-size:13px;color:#666;line-height:1.5;margin-top:3px;">${esc(t.notes)}</div>` : ''}
          ${t.owner && /[+,/&]|\sמול\s|\sו\S/.test(t.owner) ? `<div style="font-size:12px;color:#8a7a83;margin-top:3px;">אחראים: ${esc(t.owner)}</div>` : ''}
        </td>
        <td style="padding:10px 12px;vertical-align:top;white-space:nowrap;text-align:left;${border}">
          <div style="font-weight:800;font-size:14px;color:${late ? '#c0392b' : BRAND.maroon};">${esc(due) || '—'}</div>
          <div style="font-size:12px;color:${late ? '#c0392b' : '#8a7a83'};">${late ? 'באיחור' : statusLabel[t.status] || ''}</div>
        </td>
      </tr>`;
    })
    .join('');
  const lateCount = tasks.filter((t) => t.due_date && String(t.due_date).slice(0, 10) < today).length;
  return {
    kind: 'task_reminder',
    subject: `המשימות שלך לכנס · ${tasks.length} פתוחות${lateCount ? ` (${lateCount} באיחור)` : ''}`,
    html: layout({
      heading: 'המשימות הפתוחות שלך 📋',
      bodyHtml:
        p(greet) +
        p(`לקראת הכנס ב-20.10, אלה המשימות שעדיין פתוחות או בתהליך אצלך (${tasks.length}). סיימת משימה? אפשר לסמן אותה במערכת.`) +
        `<tr><td style="padding:4px 0 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:${BRAND.cream};border-radius:12px;">${rows}</table>
        </td></tr>`,
      ctas: [{ href: `${SITE_URL}/admin/tasks`, label: 'פתיחת המשימות במערכת' }],
    }),
    text:
      `${greet}\n\nהמשימות הפתוחות שלך לקראת הכנס (${tasks.length}):\n` +
      tasks
        .map((t) => `- ${t.title}${t.due_date || t.due_date_text ? ` · ${t.due_date ? fmt(t.due_date) : t.due_date_text}` : ''}`)
        .join('\n') +
      `\n\n${SITE_URL}/admin/tasks`,
  };
}
