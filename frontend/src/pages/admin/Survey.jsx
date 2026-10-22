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

function QuestionChart({ q, qKey, plain }) {
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
                {!plain && <span className="sr-opt-v">{o.v}</span>}
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

// Post-event feedback survey results (sent to attendees after the meetup).
function PostSurveyResults() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/api/invitees/post-survey')
      .then(setData)
      .catch(() => setErr('שגיאה בטעינת תוצאות סקר המשוב'));
  }, []);

  if (err) return <div className="form-error">{err}</div>;
  if (!data) return <div className="loading">טוען…</div>;

  const { survey, responses } = data;
  return (
    <>
      <div className="sr-top">
        <span className="muted">
          נשלח למי שנכנס לאירוע (סומן בכניסה), עם קישור אישי.
          {data.missed_sent > 0 && ' וגם במייל ״מה פספסת״ למי שלא הגיע.'}
        </span>
        <a className="btn btn-sm btn-ghost" href="/api/invitees/post-survey-export">
          ⬇ ייצוא לאקסל
        </a>
      </div>
      <div className="sr-summary">
        <div className="sr-total">
          <div className="sr-total-num">{data.responded}</div>
          <div className="sr-total-lbl">השיבו על סקר המשוב</div>
          {data.missed_sent > 0 && (
            <div className="sr-total-lbl">
              {responses.filter((r) => r.attended).length} השתתפו · {responses.filter((r) => !r.attended).length} לא הגיעו
            </div>
          )}
        </div>
        <div className="sr-att">
          <div className="sr-att-tile">
            <span className="sr-att-num">{data.arrived}</span>
            <span className="sr-att-lbl">נכנסו לאירוע</span>
          </div>
          <div className="sr-att-tile">
            <span className="sr-att-num">{data.sent}</span>
            <span className="sr-att-lbl">קיבלו את הסקר</span>
          </div>
          {data.missed_sent > 0 && (
            <div className="sr-att-tile">
              <span className="sr-att-num">{data.missed_sent}</span>
              <span className="sr-att-lbl">קיבלו ״מה פספסת״</span>
            </div>
          )}
          <div className="sr-att-tile sr-att-yes">
            <span className="sr-att-num">{data.sent + (data.missed_sent || 0)
                ? Math.round((data.responded / (data.sent + (data.missed_sent || 0))) * 100)
                : 0}
              %</span>
            <span className="sr-att-lbl">שיעור מענה</span>
          </div>
        </div>
      </div>
      {data.noEmail?.length > 0 && <NoEmailWhatsApp people={data.noEmail} />}
      {responses.length === 0 && <div className="muted" style={{ padding: 20 }}>עדיין אין תשובות לסקר המשוב.</div>}
      {survey.meeting && responses.length > 0 && (() => {
        const wants = responses.filter((r) => r.answers?.meeting === 'yes');
        return (
          <div className="sr-q sr-meeting">
            <div className="sr-q-title">📅 מעוניינים בפגישת המשך: {wants.length}</div>
            <div className="sr-q-sub">
              {responses.filter((r) => r.answers?.meeting === 'no').length} סימנו ״לא כרגע״. הבטחנו ליצור קשר עם המעוניינים בימים הקרובים.
            </div>
            {wants.length > 0 && (
              <ul className="sr-texts">
                {wants.map((r, j) => (
                  <li key={j}>
                    <b>{r.full_name || '—'}</b> · {r.organization || '—'}
                    {r.role ? ` · ${r.role}` : ''}
                    {r.attended === false && <span className="muted"> (לא הגיע/ה)</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}
      {responses.length > 0 &&
        survey.questions.map((q, i) => {
          if (q.type === 'text') {
            const texts = responses.filter((r) => r.answers?.[q.key]);
            return (
              <div className="sr-q" key={q.key}>
                <div className="sr-q-title">
                  <span className="sr-q-tag">{i + 1}</span>
                  {q.title}
                </div>
                <div className="sr-q-sub">{texts.length} השיבו</div>
                <ul className="sr-texts">
                  {texts.map((r, j) => (
                    <li key={j}>
                      {r.answers[q.key]} <span className="muted">· {r.full_name || '—'}, {r.organization || '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          const multi = q.type === 'multi';
          const opts = q.options.map((o) => ({ v: o, t: o }));
          const data = tally(
            responses.map((r) => r.answers || {}),
            q.key,
            multi
          );
          const others = q.other ? responses.filter((r) => r.answers?.[`${q.key}_other`]) : [];
          return (
            <div key={q.key}>
              <QuestionChart q={{ q: { ...q, options: opts }, data }} qKey={String(i + 1)} plain />
              {others.length > 0 && (
                <ul className="sr-texts sr-others">
                  {others.map((r, j) => (
                    <li key={j}>
                      ״אחר״: {r.answers[`${q.key}_other`]} <span className="muted">· {r.full_name || '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
    </>
  );
}

// WhatsApp message with the person's first name and personal survey link.
function waMessage(p) {
  const words = String(p.full_name || '').trim().split(/\s+/).filter(Boolean);
  // Skip a leading title (ד״ר / פרופ׳ / עו״ד / Dr. …) so the greeting uses the first name.
  while (words.length > 1 && /^(ד["״׳']?ר|דר["״׳'.]?|פרופ["״׳'.]?|עו["״׳']?ד|רו["״׳']?ח|מר|גב['׳.]?|dr\.?|prof\.?)$/i.test(words[0])) {
    words.shift();
  }
  const first = words[0] || '';
  return (
    `היי${first ? ` ${first}` : ''}, תודה רבה שהגעת למיטאפ "ככה עושים AI בממשלה" ב-Jeen.ai! 🙏\n` +
    'נשמח אם תקדיש/י כשתי דקות לסקר משוב קצר. התשובות יעזרו לנו להמשיך וללוות את הקהילה בצורה מדויקת:\n' +
    `${p.link}\nתודה! צוות Jeen.ai`
  );
}

function waUrl(p) {
  const digits = String(p.phone || '').replace(/\D/g, '');
  if (digits.length < 9) return null;
  const intl = digits.startsWith('972') ? digits : digits.replace(/^0/, '972');
  return `https://wa.me/${intl}?text=${encodeURIComponent(waMessage(p))}`;
}

// Attendees without an email: send them the survey over WhatsApp instead.
function NoEmailWhatsApp({ people }) {
  const [copied, setCopied] = useState(null);
  async function copy(p) {
    try {
      await navigator.clipboard.writeText(waMessage(p));
      setCopied(p.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.prompt('העתיקו את ההודעה:', waMessage(p));
    }
  }
  return (
    <div className="sr-q sr-wa">
      <div className="sr-q-title">📱 נכנסו לאירוע בלי כתובת מייל: {people.length}</div>
      <div className="sr-q-sub">
        הם לא קיבלו את הסקר במייל. ״WhatsApp״ פותח שיחה עם ההודעה והקישור האישי שלהם כבר כתובים, ונשאר רק ללחוץ שליחה.
      </div>
      <table className="sr-wa-table">
        <tbody>
          {people.map((p) => {
            const url = waUrl(p);
            return (
              <tr key={p.id}>
                <td>
                  <b>{p.full_name || '—'}</b>
                  <span className="muted"> · {p.organization || '—'}</span>
                </td>
                <td className="muted" style={{ direction: 'ltr', textAlign: 'right' }}>{p.phone || 'אין טלפון'}</td>
                <td>{p.responded ? <span className="sr-wa-done">✓ ענה/תה</span> : ''}</td>
                <td className="sr-wa-actions">
                  {url && (
                    <a className="btn btn-sm btn-primary" href={url} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  )}
                  <button className="btn btn-sm btn-ghost" onClick={() => copy(p)}>
                    {copied === p.id ? 'הועתק ✓' : 'העתקת הודעה'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Survey() {
  const [tab, setTab] = useState('post');
  return (
    <div className="survey-results">
      <div className="sr-top">
        <h1>תוצאות הסקר</h1>
      </div>
      <div className="cue-tabs sr-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'post'} className={tab === 'post' ? 'active' : ''} onClick={() => setTab('post')}>
          סקר משוב אחרי הכנס
        </button>
        <button role="tab" aria-selected={tab === 'pre'} className={tab === 'pre' ? 'active' : ''} onClick={() => setTab('pre')}>
          סקר מקדים (בהרשמה)
        </button>
      </div>
      {tab === 'post' ? <PostSurveyResults /> : <PreSurveyResults />}
    </div>
  );
}

function PreSurveyResults() {
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
    <div>
      <div className="sr-top">
        <span className="muted">התשובות לסקר הקצר בטופס ההרשמה.</span>
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
