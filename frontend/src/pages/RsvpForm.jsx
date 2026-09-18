import { useState } from 'react';
import { api } from '../api.js';
import JeenLogo from '../components/JeenLogo.jsx';

const EVENT = {
  title: 'ככה עושים AI בממשלה',
  dateLabel: 'יום שלישי, 20.10.2026 · 09:00–13:00',
  place: 'משרדי Jeen.AI · בגין 121, מגדלי עזריאלי שרונה, קומה 34, תל אביב',
  // For the add-to-calendar link (Israel time, 09:00–13:00 on 20.10.2026).
  startUtc: '20261020T060000Z',
  endUtc: '20261020T100000Z',
};

function calendarUrl() {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Jeen.AI · ${EVENT.title}`,
    dates: `${EVENT.startUtc}/${EVENT.endUtc}`,
    details: 'כנס Jeen.AI לארגונים ממשלתיים',
    location: EVENT.place,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const empty = {
  full_name: '',
  organization: '',
  role: '',
  email: '',
  phone: '',
  plus_ones: 0,
  dietary_notes: '',
  comments: '',
};

export default function RsvpForm() {
  const [form, setForm] = useState(empty);
  const [attending, setAttending] = useState(null); // null | true | false
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // resulting status string

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (attending === null) {
      setError('נא לבחור אם תגיעו לכנס.');
      return;
    }
    if (!form.full_name.trim() || !form.organization.trim() || !form.email.trim()) {
      setError('נא למלא שם מלא, ארגון וכתובת מייל.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/rsvp', {
        ...form,
        plus_ones: attending ? Number(form.plus_ones) || 0 : 0,
        attending,
      });
      setResult(res.status);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'אירעה שגיאה. נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rsvp-wrap">
      <div className="rsvp-card">
        <div className="rsvp-hero">
          <div className="hero-logo">
            <JeenLogo height={34} wordmarkColor="var(--color-cream)" />
          </div>
          <h1>{EVENT.title}</h1>
          <div className="meta">{EVENT.dateLabel}</div>
          <div className="meta">{EVENT.place}</div>
        </div>
        <div className="rsvp-body">
          {result ? (
            <Confirmation status={result} />
          ) : (
            <form onSubmit={submit} noValidate>
              {error && <div className="form-error">{error}</div>}

              <div className="soft-block">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>האם תגיעו לכנס? <span className="required-star">*</span></label>
                  <div className="attend-toggle">
                    <button
                      type="button"
                      className={attending === true ? 'active-yes' : ''}
                      onClick={() => setAttending(true)}
                    >
                      כן, אגיע 🎉
                    </button>
                    <button
                      type="button"
                      className={attending === false ? 'active-no' : ''}
                      onClick={() => setAttending(false)}
                    >
                      לא אוכל להגיע
                    </button>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>שם מלא <span className="required-star">*</span></label>
                <input type="text" value={form.full_name} onChange={set('full_name')} required />
              </div>
              <div className="field">
                <label>ארגון / משרד <span className="required-star">*</span></label>
                <input type="text" value={form.organization} onChange={set('organization')} required />
              </div>
              <div className="field">
                <label>תפקיד</label>
                <input type="text" value={form.role} onChange={set('role')} />
              </div>
              <div className="field">
                <label>כתובת מייל <span className="required-star">*</span></label>
                <input type="email" value={form.email} onChange={set('email')} dir="ltr" required />
              </div>
              <div className="field">
                <label>טלפון</label>
                <input type="tel" value={form.phone} onChange={set('phone')} dir="ltr" />
              </div>

              {attending === true && (
                <>
                  <div className="field">
                    <label>כמה אנשים נוספים תביאו איתכם?</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={form.plus_ones}
                      onChange={set('plus_ones')}
                    />
                  </div>
                  <div className="field">
                    <label>הערות תזונה / העדפות</label>
                    <input type="text" value={form.dietary_notes} onChange={set('dietary_notes')} />
                  </div>
                </>
              )}

              <div className="field">
                <label>הערות</label>
                <textarea value={form.comments} onChange={set('comments')} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? 'שולח…' : 'שליחת הרשמה'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Confirmation({ status }) {
  if (status === 'confirmed') {
    return (
      <div className="confirm-screen">
        <div className="confirm-emoji">🎉</div>
        <h2>ההגעה שלכם אושרה!</h2>
        <p>נשמח לראותכם בכנס. שלחנו את הפרטים למייל.</p>
        <p className="muted">{EVENT.dateLabel}</p>
        <a className="btn btn-primary cal-link" href={calendarUrl()} target="_blank" rel="noreferrer">
          הוספה ליומן Google
        </a>
      </div>
    );
  }
  if (status === 'waitlist') {
    return (
      <div className="confirm-screen">
        <div className="confirm-emoji">⏳</div>
        <h2>נרשמתם לרשימת ההמתנה</h2>
        <p>הכנס מלא כרגע — אם יתפנה מקום, ניצור אתכם קשר בהקדם.</p>
        <p className="muted">תודה על ההתעניינות!</p>
      </div>
    );
  }
  return (
    <div className="confirm-screen">
      <div className="confirm-emoji">🙏</div>
      <h2>תודה שעדכנתם אותנו</h2>
      <p>חבל שלא תוכלו להגיע הפעם — נשמח לראותכם באירוע הבא.</p>
    </div>
  );
}
