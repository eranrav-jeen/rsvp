import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

// Landing page for the reminder email's "will you attend?" buttons. The email
// links here with ?a=yes|unsure|no pre-selected; the answer is only recorded when
// the person presses "אישור" (mail scanners open links, but don't press buttons).

const OPTIONS = [
  { key: 'yes', cls: 'active-yes', label: 'כן, אני מגיע/ה' },
  { key: 'unsure', cls: 'active-maybe', label: 'עוד לא בטוח/ה' },
  { key: 'no', cls: 'active-no', label: 'לצערי לא אוכל להגיע' },
];

const THANKS = {
  yes: { title: 'מעולה, נתראה ב-20.10! 🎉', body: 'שמרנו לך מקום. כל הפרטים וסדר היום מחכים לך במייל.' },
  unsure: {
    title: 'תודה על העדכון 🙏',
    body: 'בינתיים שמרנו לך את המקום. נשמח שתעדכנו ברגע שתדעו — דרך אותו קישור מהמייל.',
  },
  no: {
    title: 'חבל, תודה שעדכנת אותנו 🙏',
    body: 'שחררנו את המקום למישהו מרשימת ההמתנה. שינית את דעתך? אפשר לחזור לכאן דרך הקישור מהמייל.',
  },
};

export default function Reply() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const preset = OPTIONS.some((o) => o.key === params.get('a')) ? params.get('a') : null;

  const [info, setInfo] = useState(null); // { name, answer, canAnswer }
  const [loadError, setLoadError] = useState(false);
  const [choice, setChoice] = useState(preset);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/api/reply/${encodeURIComponent(token)}`)
      .then((d) => {
        setInfo(d);
        if (!preset && d.answer) setChoice(d.answer);
      })
      .catch(() => setLoadError(true));
  }, [token, preset]);

  async function submit() {
    if (!choice) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/api/reply/${encodeURIComponent(token)}`, { answer: choice });
      setSaved(choice);
    } catch {
      setError('לא הצלחנו לשמור את התשובה. נסו שוב בעוד רגע.');
    } finally {
      setSaving(false);
    }
  }

  const firstName = info?.name ? info.name.trim().split(/\s+/)[0] : '';
  const registerUrl = `${window.location.origin}/rsvp`;

  let content;
  if (loadError) {
    content = <p className="muted">הקישור אינו תקין. אפשר לפנות אלינו במייל שממנו קיבלת את ההזמנה.</p>;
  } else if (!info) {
    content = <p className="muted">טוען…</p>;
  } else if (!info.canAnswer) {
    content = <p className="muted">לא מצאנו הרשמה פעילה עבור הקישור הזה. לשאלות אפשר להשיב למייל שקיבלת.</p>;
  } else if (saved) {
    content = (
      <div className="reply-thanks">
        <h2>{THANKS[saved].title}</h2>
        <p>{THANKS[saved].body}</p>
        <div className="reply-share">
          👥 מכירים עוד מישהו שכדאי שיגיע? שלחו לו את קישור ההרשמה:{' '}
          <a href={registerUrl}>{registerUrl}</a>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setSaved(null)}>
          שינוי התשובה
        </button>
      </div>
    );
  } else {
    content = (
      <>
        <p className="reply-q">
          {firstName ? `${firstName}, ` : ''}נתראה בכנס ביום שלישי, 20.10?
        </p>
        {error && <div className="form-error">{error}</div>}
        <div className="attend-toggle reply-toggle">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={choice === o.key ? o.cls : ''}
              onClick={() => setChoice(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary reply-submit" disabled={!choice || saving} onClick={submit}>
          {saving ? 'שומר…' : 'אישור'}
        </button>
        <p className="muted reply-note">
          <a href="/agenda" target="_blank" rel="noreferrer">
            לסדר היום המלא
          </a>
        </p>
      </>
    );
  }

  return (
    <div className="rsvp-wrap">
      <div className="rsvp-card">
        <div className="rsvp-hero">
          <div className="hero-logo">
            <img src="/jeen-logo-white.png" alt="Jeen.ai" className="hero-logo-img" />
          </div>
          <h1>ככה עושים AI בממשלה</h1>
          <div className="meta meta-date">יום שלישי, 20.10.2026 · 09:00–13:00</div>
        </div>
        <div className="rsvp-body">{content}</div>
      </div>
    </div>
  );
}
