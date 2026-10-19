import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { SURVEY } from '../../survey.js';

const ATT = [
  { v: 'yes', lbl: 'מגיעים', cls: 'sr-att-yes' },
  { v: 'maybe', lbl: 'אולי', cls: 'sr-att-maybe' },
  { v: 'no', lbl: 'לא מגיעים', cls: 'sr-att-no' },
];

// Count responses per option value for a question. `multi` sums across arrays.
function tally(responses, qKey, multi) {
  const counts = {};
  let answered = 0;
  for (const r of responses) {
    const val = r[qKey];
    if (multi) {
      if (Array.isArray(val) && val.length) {
        answered += 1;
        for (const v of val) counts[v] = (counts[v] || 0) + 1;
      }
    } else if (val) {
      answered += 1;
      counts[val] = (counts[val] || 0) + 1;
    }
  }
  return { counts, answered };
}

function QuestionChart({ q, qKey }) {
  const multi = q.q.type === 'multi';
  const { counts, answered } = q.data;
  const max = Math.max(1, ...q.q.options.map((o) => counts[o.v] || 0));
  return (
    <div className="sr-q">
      <div className="sr-q-title">
        <span className="sr-q-tag">{qKey.toUpperCase()}</span>
        {q.q.title}
      </div>
      <div className="sr-q-sub">
        {answered} השיבו{multi ? ' · ניתן לסמן יותר מתשובה אחת, ולכן הסכום עשוי לעלות על 100%' : ''}
      </div>
      <div className="sr-bars">
        {q.q.options.map((o) => {
          const n = counts[o.v] || 0;
          const pct = answered ? Math.round((n / answered) * 100) : 0;
          return (
            <div className="sr-bar-row" key={o.v} title={`${n} (${pct}%)`}>
              <div className="sr-bar-label">
                <span className="sr-opt-v">{o.v}</span>
                {o.t}
              </div>
              <div className="sr-bar-track">
                <div
                  className={`sr-bar-fill ${multi ? 'multi' : ''}`}
                  style={{ width: `${Math.round((n / max) * 100)}%` }}
                />
              </div>
              <div className="sr-bar-val">
                <b>{n}</b> <span className="muted">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Survey() {
  const [responses, setResponses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/invitees/survey-results');
        setResponses(res.responses || []);
      } catch {
        setErr('שגיאה בטעינת תוצאות הסקר');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading">טוען…</div>;
  if (err) return <div className="form-error">{err}</div>;

  const total = responses.length;
  const attCounts = {};
  for (const r of responses) attCounts[r.attendance] = (attCounts[r.attendance] || 0) + 1;

  const charts = ['q1', 'q2', 'q3'].map((k) => ({
    key: k,
    q: SURVEY[k],
    data: tally(responses, k, SURVEY[k].type === 'multi'),
  }));

  return (
    <div className="survey-results">
      <div className="sr-top">
        <h1>תוצאות הסקר</h1>
        <a className="btn btn-sm btn-ghost" href="/api/invitees/survey-export">
          ⬇ ייצוא לאקסל
        </a>
      </div>

      {total === 0 ? (
        <div className="muted" style={{ padding: 20 }}>עדיין אין תשובות לסקר.</div>
      ) : (
        <>
          <div className="sr-summary">
            <div className="sr-total">
              <div className="sr-total-num">{total}</div>
              <div className="sr-total-lbl">השיבו על הסקר</div>
            </div>
            <div className="sr-att">
              {ATT.map((a) => (
                <div className={`sr-att-tile ${a.cls}`} key={a.v}>
                  <span className="sr-att-num">{attCounts[a.v] || 0}</span>
                  <span className="sr-att-lbl">{a.lbl}</span>
                </div>
              ))}
            </div>
          </div>

          {charts.map((c) => (
            <QuestionChart key={c.key} q={c} qKey={c.key} />
          ))}
        </>
      )}
    </div>
  );
}
