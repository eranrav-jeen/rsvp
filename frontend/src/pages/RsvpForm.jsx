import { useState } from 'react';
import { api } from '../api.js';

const EVENT = {
  title: 'ככה עושים AI בממשלה',
  dateLabel: 'יום שלישי, 20.10.2026 · 09:00–13:00',
  place: 'משרדי Jeen.ai · בגין 121, מגדלי עזריאלי שרונה, קומה 34, תל אביב',
  startUtc: '20261020T060000Z',
  endUtc: '20261020T100000Z',
};

const MCKINSEY_URL =
  'https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai#/';

const SURVEY = {
  q1: {
    type: 'single',
    title: 'כיצד היית מתאר את השימוש ב-AI במשרד שלך? (ניתן לסמן תשובה אחת בלבד)',
    options: [
      { v: 'א', t: 'אין אצלנו כלל שימוש ב-AI.' },
      { v: 'ב', t: 'יש אצלנו התנסויות מקומיות (שלב הניסוי).' },
      { v: 'ג', t: 'יש אצלנו פיילוטים המקיפים לפחות יחידה עסקית אחת (שלב הפיילוט).' },
      { v: 'ד', t: 'יש אצלנו שימוש חוצה ארגוני ורוחבי (שלב הסקיילינג).' },
    ],
  },
  q2: {
    type: 'multi',
    title: 'מה מההיגדים הבאים נכון לארגון שלך ביחס לשימוש ב-AI? (ניתן לסמן יותר מתשובה אחת)',
    options: [
      { v: 'א', t: 'יש שיפור בפרודוקטיביות כתוצאה מהשימוש ב-AI.' },
      { v: 'ב', t: 'יש פיתוח של מיומנויות חדשות בקרב רוב העובדים בארגון.' },
      { v: 'ג', t: 'יש שיפור בקבלת ההחלטות בארגון כתוצאה משימוש ב-AI.' },
      { v: 'ד', t: 'יש גם השפעות שליליות (עומס, לחץ, שחיקה) שנחוות בארגון כתוצאה מכניסת השימוש ב-AI.' },
    ],
  },
  q3: {
    type: 'single',
    title:
      'האם את/ה מצפ/ה להגדלת תקציב ה-IT כתוצאה משילוב הוצאות על AI (תשתית, טוקנים, רישוי וכו׳)?',
    options: [
      { v: 'א', t: 'כלל לא.' },
      { v: 'ב', t: 'מצפה להגדלה של 10% לכל היותר.' },
      { v: 'ג', t: 'מצפה להגדלה של בין 10% ל-30%.' },
      { v: 'ד', t: 'מצפה להגדלה של מעל ל-30%.' },
    ],
  },
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
};

export default function RsvpForm() {
  const [form, setForm] = useState(empty);
  const [attendance, setAttendance] = useState(null); // 'yes' | 'maybe' | 'no'
  const [surveyOptIn, setSurveyOptIn] = useState(false);
  const [survey, setSurvey] = useState({ q1: '', q2: [], q3: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setSingle = (q) => (v) => setSurvey((s) => ({ ...s, [q]: v }));
  const toggleMulti = (q, v) =>
    setSurvey((s) => {
      const arr = s[q] || [];
      return { ...s, [q]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (attendance === null) {
      setError('נא לבחור אם תגיעו לכנס.');
      return;
    }
    if (
      !form.full_name.trim() ||
      !form.organization.trim() ||
      !form.email.trim() ||
      !form.phone.trim()
    ) {
      setError('נא למלא שם מלא, ארגון, כתובת מייל וטלפון.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/rsvp', {
        ...form,
        plus_ones: attendance === 'yes' ? Number(form.plus_ones) || 0 : 0,
        attendance,
        survey: surveyOptIn ? survey : null,
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
            <img src="/jeen-logo-white.png" alt="Jeen.ai" className="hero-logo-img" />
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
                  <label>
                    האם תרצ/י להגיע לכנס? <span className="required-star">*</span>
                  </label>
                  <div className="attend-toggle">
                    <button
                      type="button"
                      className={attendance === 'yes' ? 'active-yes' : ''}
                      onClick={() => setAttendance('yes')}
                    >
                      כן, אשמח
                    </button>
                    <button
                      type="button"
                      className={attendance === 'maybe' ? 'active-maybe' : ''}
                      onClick={() => setAttendance('maybe')}
                    >
                      אולי
                    </button>
                    <button
                      type="button"
                      className={attendance === 'no' ? 'active-no' : ''}
                      onClick={() => setAttendance('no')}
                    >
                      לא אוכל להגיע
                    </button>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>
                  שם מלא <span className="required-star">*</span>
                </label>
                <input type="text" value={form.full_name} onChange={set('full_name')} required />
              </div>
              <div className="field">
                <label>
                  ארגון / משרד <span className="required-star">*</span>
                </label>
                <input type="text" value={form.organization} onChange={set('organization')} required />
              </div>
              <div className="field">
                <label>תפקיד</label>
                <input type="text" value={form.role} onChange={set('role')} />
              </div>
              <div className="field">
                <label>
                  כתובת מייל <span className="required-star">*</span>
                </label>
                <input type="email" value={form.email} onChange={set('email')} dir="ltr" required />
              </div>
              <div className="field">
                <label>
                  טלפון <span className="required-star">*</span>
                </label>
                <input type="tel" value={form.phone} onChange={set('phone')} dir="ltr" required />
              </div>

              {attendance === 'yes' && (
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
                </>
              )}

              {/* Optional McKinsey-style survey */}
              <div className="soft-block survey-block">
                <div className="survey-header">
                  <div className="survey-title">מצפן הבינה למגזר הציבורי:</div>
                  <div className="survey-subtitle">מהבטחה ליישום בסקייל</div>
                </div>
                <label className="survey-optin">
                  <input
                    type="checkbox"
                    checked={surveyOptIn}
                    onChange={(e) => setSurveyOptIn(e.target.checked)}
                  />
                  <span>
                    ברוח{' '}
                    <a
                      href={MCKINSEY_URL}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      המחקר שפרסמה חברת מקינזי לאחרונה
                    </a>{' '}
                    — אשמח לענות על סקר קצר (3 שאלות)
                  </span>
                </label>

                {surveyOptIn && (
                  <div className="survey-questions">
                    <p className="survey-intro">
                      מתחייבים לא לפרסם את המידע הפרטני ביחס לארגונים המשיבים.
                    </p>

                    {['q1', 'q2', 'q3'].map((q) => (
                      <div className="survey-q" key={q}>
                        <div className="survey-q-title">{SURVEY[q].title}</div>
                        {SURVEY[q].options.map((o) => (
                          <label className="survey-opt" key={o.v}>
                            <input
                              type={SURVEY[q].type === 'multi' ? 'checkbox' : 'radio'}
                              name={`survey-${q}`}
                              checked={
                                SURVEY[q].type === 'multi'
                                  ? (survey[q] || []).includes(o.v)
                                  : survey[q] === o.v
                              }
                              onChange={() =>
                                SURVEY[q].type === 'multi'
                                  ? toggleMulti(q, o.v)
                                  : setSingle(q)(o.v)
                              }
                            />
                            <span>
                              <b>{o.v}.</b> {o.t}
                            </span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={submitting}
              >
                {submitting ? 'שולח…' : 'שליחת בקשת הרשמה'}
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
  if (status === 'pending') {
    return (
      <div className="confirm-screen">
        <div className="confirm-emoji">📝</div>
        <h2>הבקשה שלכם התקבלה!</h2>
        <p>ההשתתפות בכנס מותנית באישור. נבדוק את הבקשה ונעדכן אתכם במייל בהקדם.</p>
        <p className="muted">תודה על ההתעניינות!</p>
      </div>
    );
  }
  if (status === 'maybe') {
    return (
      <div className="confirm-screen">
        <div className="confirm-emoji">🤔</div>
        <h2>תודה! רשמנו "אולי"</h2>
        <p>נשמח אם תעדכנו אותנו ברגע שתדעו — נשמור לכם מקום בינתיים.</p>
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
