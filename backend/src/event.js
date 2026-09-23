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

// Google Calendar "add to calendar" link for the event.
export function calendarUrl() {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Jeen.ai · ${EVENT.title} ${EVENT.subtitle}`.trim(),
    dates: `${EVENT.startUtc}/${EVENT.endUtc}`,
    details: 'כנס Jeen.ai לארגונים ממשלתיים',
    location: EVENT.place,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
