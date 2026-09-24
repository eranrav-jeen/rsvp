// Central event details, shared by the outbound emails. Mirrors the strings the
// public RSVP form shows (frontend/src/pages/RsvpForm.jsx). Each field can be
// overridden with an env var so the details can change without a code deploy.
export const EVENT = {
  title: process.env.EVENT_TITLE || 'ככה עושים AI בממשלה',
  subtitle: process.env.EVENT_SUBTITLE || 'מהבטחה ליישום בסקייל',
  dateLabel: process.env.EVENT_DATE_LABEL || 'יום שלישי, 20.10.2026 · 09:00–13:00',
  place:
    process.env.EVENT_PLACE ||
    'משרדי Jeen.ai · בגין 121, מגדלי עזריאלי שרונה, קומה 34, תל אביב',
  startUtc: process.env.EVENT_START_UTC || '20261020T060000Z',
  endUtc: process.env.EVENT_END_UTC || '20261020T100000Z',
};

// Public URL of the RSVP form, used in emails as a "register / change your mind"
// link. Override with PUBLIC_BASE_URL if the site moves.
export const SITE_URL = (process.env.PUBLIC_BASE_URL || 'https://rsvp.jeenai.app').replace(/\/+$/, '');

const EVENT_SUMMARY = `${EVENT.title} ${EVENT.subtitle}`.trim();
const EVENT_DETAILS = 'כנס Jeen.ai לארגונים ממשלתיים';

// '20261020T060000Z' -> '2026-10-20T06:00:00Z' (ISO 8601, for Outlook links).
function isoFromCompact(c) {
  return c.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z');
}

// Google Calendar "add to calendar" link.
export function calendarUrl() {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: EVENT_SUMMARY,
    dates: `${EVENT.startUtc}/${EVENT.endUtc}`,
    details: EVENT_DETAILS,
    location: EVENT.place,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Outlook.com / Microsoft 365 web "add event" deep link.
export function outlookCalendarUrl() {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: EVENT_SUMMARY,
    startdt: isoFromCompact(EVENT.startUtc),
    enddt: isoFromCompact(EVENT.endUtc),
    location: EVENT.place,
    body: EVENT_DETAILS,
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// URL of the downloadable .ics (Apple Calendar, Outlook desktop, and any other
// client). Served by the backend at /api/calendar.ics.
export function icsUrl() {
  return `${SITE_URL}/api/calendar.ics`;
}

// The iCalendar (.ics) content for the event.
export function icsContent() {
  const esc = (s) =>
    String(s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jeen.ai//RSVP//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:jeen-event-20261020@jeen.ai',
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${EVENT.startUtc}`,
    `DTEND:${EVENT.endUtc}`,
    `SUMMARY:${esc(EVENT_SUMMARY)}`,
    `DESCRIPTION:${esc(EVENT_DETAILS)}`,
    `LOCATION:${esc(EVENT.place)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
