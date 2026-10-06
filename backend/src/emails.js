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
function digestHeadline(confirmed, invited) {
  const pct = invited > 0 ? Math.min(100, Math.round((confirmed / invited) * 100)) : 0;
  return `<tr><td style="padding:4px 0 16px;">
      <div style="background:${BRAND.maroon};border-radius:14px;padding:18px 16px;text-align:center;color:#fff;">
        <div style="font-size:14px;color:${BRAND.amber};font-weight:700;">🎟️ אישרו הגעה (כולל מרצים) מתוך המוזמנים</div>
        <div style="font-size:44px;font-weight:800;line-height:1.15;margin-top:4px;direction:ltr;">
          ${confirmed} <span style="color:${BRAND.amber};font-weight:700;">/</span> ${invited}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="margin-top:10px;background:rgba(255,255,255,.18);border-radius:6px;">
          <tr><td style="height:8px;line-height:8px;font-size:0;border-radius:6px;
                         background:${BRAND.amber};width:${Math.max(pct, 1)}%;">&nbsp;</td>
              <td style="font-size:0;line-height:8px;">&nbsp;</td></tr>
        </table>
        <div style="font-size:13px;margin-top:6px;color:${BRAND.cream};">${pct}% מהמוזמנים</div>
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
  const statsHtml =
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
    subject: `דוח הרשמה יומי · ${dateLabel} · ${attending}/${invitedCount} אישרו, ${s.pending} ממתינים`,
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
      `אישרו הגעה (כולל מרצים) מתוך המוזמנים: ${attending} / ${invitedCount}\n\n` +
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
      `פוטנציאל: ${s.total} · טרם הוזמנו: ${s.not_invited} · הוזמנו: ${s.invited} · ` +
      `ממתינים: ${s.pending} · אושרו: ${s.confirmed} · אולי: ${s.maybe} · לא יגיעו: ${s.declined}\n` +
      `מקומות מאושרים: ${s.confirmed_seats}/${s.max_attendees} · הוזמנו במייל: ${s.outreach_email}\n\n` +
      `המלצות לפעולה:\n${recommendations.map((r) => `- ${r}`).join('\n')}`,
  };
}
