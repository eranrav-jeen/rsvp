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

// Internal daily status digest (registration status + action recommendations).
export function dailyDigest({ dateLabel, daysToEvent, stats, recommendations }) {
  const s = stats;
  const row = (label, val) =>
    `<tr><td style="padding:4px 0;color:#555;">${label}</td>` +
    `<td style="padding:4px 0;font-weight:700;color:${BRAND.maroon};text-align:left;">${val}</td></tr>`;
  const statsTable = `<tr><td style="padding:6px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
        ${row('מספר מוזמנים פוטנציאלי', s.total)}
        ${row('טרם הוזמנו', s.not_invited)}
        ${row('הוזמנו (טרם השיבו)', s.invited)}
        ${row('ממתינים לאישור', s.pending)}
        ${row('אושרה השתתפות', s.confirmed)}
        ${row('מרצים/ות', s.speaker)}
        ${row('אולי', s.maybe)}
        ${row('רשימת המתנה', s.waitlist)}
        ${row('סימנו שלא יגיעו', s.declined)}
        ${row('הוזמנו במייל', s.outreach_email)}
        ${row('ללא כתובת מייל', s.noEmail)}
        ${row('מקומות מאושרים מול מכסה', `${s.confirmed_seats} / ${s.max_attendees}`)}
      </table>
    </td></tr>`;
  const recsHtml = recommendations.length
    ? `<tr><td style="padding:14px 0 0;">
         <div style="font-weight:800;color:${BRAND.maroon};margin-bottom:6px;">המלצות לפעולה</div>
         <ul style="margin:0;padding-inline-start:18px;color:${BRAND.text};font-size:15px;line-height:1.75;">
           ${recommendations.map((r) => `<li>${r}</li>`).join('')}
         </ul>
       </td></tr>`
    : '';
  return {
    kind: 'daily_digest',
    subject: `דוח הרשמה יומי · ${dateLabel} · ${s.confirmed} מאושרים, ${s.pending} ממתינים`,
    html: layout({
      heading: `סטטוס הרשמה · ${dateLabel}`,
      bodyHtml: p(`נותרו <b>${daysToEvent}</b> ימים לכנס.`) + statsTable + recsHtml,
      ctas: [{ href: `${SITE_URL}/admin/invitees`, label: 'פתיחת לוח הבקרה' }],
    }),
    text:
      `סטטוס הרשמה · ${dateLabel}\nנותרו ${daysToEvent} ימים לכנס.\n\n` +
      `פוטנציאל: ${s.total} · טרם הוזמנו: ${s.not_invited} · הוזמנו: ${s.invited} · ` +
      `ממתינים: ${s.pending} · אושרו: ${s.confirmed} · אולי: ${s.maybe} · לא יגיעו: ${s.declined}\n` +
      `מקומות מאושרים: ${s.confirmed_seats}/${s.max_attendees} · הוזמנו במייל: ${s.outreach_email}\n\n` +
      `המלצות לפעולה:\n${recommendations.map((r) => `- ${r}`).join('\n')}`,
  };
}
