import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import SURVEY from '../feedbackSurvey.json';

// Post-event feedback survey (personal link from the thank-you email).
// Questions come from feedbackSurvey.json; answers can be updated later.

export default function Feedback() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/api/feedback/${encodeURIComponent(token)}`)
      .then((d) => {
        setInfo(d);
        if (d.answers) setAnswers(d.answers);
      })
      .catch(() => setLoadError(true));
  }, [token]);

  const setSingle = (k, v) => setAnswers((a) => ({ ...a, [k]: v }));
  const toggleMulti = (q, v) =>
    setAnswers((a) => {
      const cur = Array.isArray(a[q.key]) ? a[q.key] : [];
      if (cur.includes(v)) return { ...a, [q.key]: cur.filter((x) => x !== v) };
      if (q.max && cur.length >= q.max) return a; // limit reached
      return { ...a, [q.key]: [...cur, v] };
    });

  async function submit(e) {
    e.preventDefault();
    const missing = SURVEY.questions.filter((q) => q.type !== 'text').filter((q) => {
      const v = answers[q.key];
      return Array.isArray(v) ? v.length === 0 : !v;
    });
    if (missing.length) {
      setError('נשמח לתשובה על כל שאלות הבחירה (שאלה 3 היא רשות).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`/api/feedback/${encodeURIComponent(token)}`, { answers });
      setSaved(true);
      window.scrollTo(0, 0);
    } catch {
      setError('לא הצלחנו לשמור את התשובות. נסו שוב בעוד רגע.');
    } finally {
      setSaving(false);
    }
  }

  const firstName = info?.name ? info.name.trim().split(/\s+/)[0] : '';

  let content;
  if (loadError) {
    content = <p className="muted">הקישור אינו תקין. אפשר להשיב למייל שממנו הגעתם לכאן.</p>;
  } else if (!info) {
    content = <p className="muted">טוען…</p>;
  } else if (saved) {
    content = (
      <div className="reply-thanks">
        <h2>תודה רבה! 🙏</h2>
        <p>התשובות נשמרו. ניצור קשר בהתאם לצעד הבא שבחרתם.</p>
        <button type="button" className="btn btn-ghost" onClick={() => setSaved(false)}>
          עדכון התשובות
        </button>
      </div>
    );
  } else {
    content = (
      <form onSubmit={submit} noValidate>
        <p className="fb-intro">
          {firstName ? `${firstName}, ` : ''}תודה שהגעת! שבע שאלות קצרות, כשתי דקות. התשובות ישמשו אותנו בלבד ולא
          יפורסמו ברמת ארגון.
        </p>
        {SURVEY.questions.map((q, i) => (
          <div className="survey-q fb-q" key={q.key}>
            <div className="survey-q-title">
              {i + 1}. {q.title}
              {q.type === 'text' && <span className="muted"> (רשות)</span>}
            </div>
            {q.type === 'text' ? (
              <textarea
                id={`fb-${q.key}`}
                className="fb-text"
                rows={3}
                value={answers[q.key] || ''}
                onChange={(e) => setSingle(q.key, e.target.value)}
              />
            ) : (
              q.options.map((o) => {
                const multi = q.type === 'multi';
                const cur = answers[q.key];
                const checked = multi ? (Array.isArray(cur) ? cur : []).includes(o) : cur === o;
                const full = multi && q.max && !checked && (cur || []).length >= q.max;
                return (
                  <label className={`survey-opt ${full ? 'fb-disabled' : ''}`} key={o}>
                    <input
                      type={multi ? 'checkbox' : 'radio'}
                      name={`fb-${q.key}`}
                      checked={checked}
                      disabled={full}
                      onChange={() => (multi ? toggleMulti(q, o) : setSingle(q.key, o))}
                    />
                    <span>{o}</span>
                  </label>
                );
              })
            )}
            {q.other && (answers[q.key] || []).includes(q.other) && (
              <input
                id={`fb-${q.key}-other`}
                className="fb-other"
                type="text"
                placeholder="פרטו בקצרה"
                value={answers[`${q.key}_other`] || ''}
                onChange={(e) => setSingle(`${q.key}_other`, e.target.value)}
              />
            )}
          </div>
        ))}
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="btn btn-primary reply-submit" disabled={saving}>
          {saving ? 'שומר…' : 'שליחה'}
        </button>
      </form>
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
          <div className="hero-subtitle">סקר משוב · 2 דקות</div>
        </div>
        <div className="rsvp-body">{content}</div>
      </div>
    </div>
  );
}
