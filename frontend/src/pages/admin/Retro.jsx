import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';

// Post-event reflection: summary statistics on top, then discussion topics with
// shared free-text notes (auto-saved to the server, visible to the whole team).

const TOPICS = [
  { key: 'worked', title: '✅ מה עבד טוב ושווה לשמר?' },
  { key: 'improve', title: '🔧 מה פחות עבד ומה לשפר?' },
  { key: 'recruitment', title: '📨 גיוס והרשמה', hint: 'ההזמנות, התזכורות, אימות ההגעה בטלפון ובמייל, שיעור ההגעה מול המאושרים' },
  { key: 'content', title: '🎤 תוכן', hint: 'ההרצאות, ההדגמה החיה, הפאנל, התזמון' },
  { key: 'operations', title: '🏢 אופרציה ביום האירוע', hint: 'כניסה ותעודות זהות, QR למעליות, עמדת הקבלה, כיבוד, עמידה בלו״ז' },
  { key: 'tech', title: '🔊 טכני', hint: 'מסך, סאונד, מצגות, ההדגמה' },
  { key: 'audience', title: '👥 קהל ונטוורקינג', hint: 'מי הגיע, איכות השיחות, ארגונים שחסרו' },
  { key: 'followup', title: '📈 המשך ולידים', hint: 'סקר המשוב, בקשות לפגישה, מי מטפל במה' },
  { key: 'system', title: '🖥️ מערכת ההרשמה וניהול האירוע', hint: 'מה עזר, מה חסר' },
  { key: 'next', title: '💡 האירוע הבא', hint: 'רעיונות, פורמט, מועד, נושאים' },
  { key: 'actions', title: '📋 משימות להמשך', hint: 'מה, מי ועד מתי' },
];

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

function Stat({ num, lbl, sub, strong }) {
  return (
    <div className={`rt-stat ${strong ? 'strong' : ''}`}>
      <div className="rt-num">{num}</div>
      <div className="rt-lbl">{lbl}</div>
      {sub && <div className="rt-sub">{sub}</div>}
    </div>
  );
}

function NoteBox({ topic, initial, initialAt }) {
  const [text, setText] = useState(initial || '');
  const [state, setState] = useState(initialAt ? 'saved' : 'idle'); // idle | dirty | saving | saved | error
  const [at, setAt] = useState(initialAt || null);
  const timer = useRef(null);
  const last = useRef(initial || '');

  async function save(value) {
    if (value === last.current) return;
    setState('saving');
    try {
      const { note } = await api.put(`/api/retro/notes/${topic.key}`, { body: value });
      last.current = value;
      setAt(note.updated_at);
      setState('saved');
    } catch {
      setState('error');
    }
  }

  function onChange(e) {
    const v = e.target.value;
    setText(v);
    setState('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(v), 1200);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const status =
    state === 'saving'
      ? 'שומר…'
      : state === 'error'
        ? 'השמירה נכשלה, נסו שוב'
        : state === 'dirty'
          ? '…'
          : at
            ? `נשמר ${new Date(at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
            : '';

  return (
    <div className="rt-topic">
      <div className="rt-topic-head">
        <label htmlFor={`rt-${topic.key}`} className="rt-topic-title">
          {topic.title}
        </label>
        <span className={`rt-save ${state === 'error' ? 'err' : ''}`}>{status}</span>
      </div>
      {topic.hint && <div className="rt-hint">{topic.hint}</div>}
      <textarea
        id={`rt-${topic.key}`}
        rows={4}
        value={text}
        onChange={onChange}
        onBlur={() => {
          clearTimeout(timer.current);
          save(text);
        }}
        placeholder="כתבו כאן…"
      />
    </div>
  );
}

export default function Retro() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/api/retro')
      .then(setData)
      .catch(() => setErr('שגיאה בטעינת הנתונים'));
  }, []);

  if (err) return <div className="form-error">{err}</div>;
  if (!data) return <div className="loading">טוען…</div>;

  const s = data.stats;
  const notes = Object.fromEntries(data.notes.map((n) => [n.key, n]));
  const total = s.arrived + s.guests;
  const e = s.emails || {};
  const d = data.declined || { rejected: [], rejectedOrgs: [], total: 0, cancelled: 0, said_no: 0, other: 0, notified: 0 };

  return (
    <div className="retro">
      <h1>סיכום ותחקיר · ככה עושים AI בממשלה</h1>
      <p className="muted rt-intro">הנתונים לא כוללים עובדי Jeen. ההערות נשמרות אוטומטית ומשותפות לכל הצוות.</p>

      <div className="rt-hero">
        <Stat strong num={total} lbl="נכחו באירוע" sub={`${s.arrived} משתתפים + ${s.guests} מלווים`} />
        <Stat num={pct(s.approved_arrived, s.approved)} lbl="שיעור הגעה" sub={`${s.approved_arrived} מתוך ${s.approved} מאושרים`} />
        <Stat num={s.no_shows} lbl="מאושרים שלא הגיעו" />
        <Stat num={s.walk_ins} lbl="הצטרפו בכניסה" />
        <Stat num={s.orgs_arrived} lbl="ארגונים שהגיעו" />
      </div>

      <div className="rt-grid">
        <section className="rt-card">
          <h2>משפך ההרשמה</h2>
          <table className="rt-table">
            <tbody>
              <tr><td>ברשימת המוזמנים</td><td>{s.list_total}</td><td /></tr>
              <tr><td>הוזמנו</td><td>{s.invited}</td><td>{pct(s.invited, s.list_total)}</td></tr>
              <tr><td>נרשמו בטופס (״מגיע/ה״)</td><td>{s.registered}</td><td>{pct(s.registered, s.invited)}</td></tr>
              <tr><td>אושרו (כולל {s.speakers} מרצים)</td><td>{s.approved}</td><td /></tr>
              <tr><td>אישרו הגעה באימות</td><td>{s.validated}</td><td>{pct(s.validated, s.approved)}</td></tr>
              <tr className="hl"><td>הגיעו מתוך המאושרים</td><td>{s.approved_arrived}</td><td>{pct(s.approved_arrived, s.approved)}</td></tr>
              <tr><td>לא מגיעים / רשימת המתנה</td><td>{s.declined} / {s.waitlist}</td><td /></tr>
            </tbody>
          </table>
        </section>

        <section className="rt-card">
          <h2>פניות ותקשורת</h2>
          <table className="rt-table">
            <tbody>
              <tr><td>קיבלו פנייה במייל</td><td>{s.by_email}</td></tr>
              <tr><td>קיבלו פנייה בוואטסאפ</td><td>{s.by_whatsapp}</td></tr>
              <tr><td>קיבלו פנייה טלפונית</td><td>{s.by_call}</td></tr>
              <tr><td>מייל תזכורת שבוע לפני</td><td>{e.reminder || 0}</td></tr>
              <tr><td>מייל ״מקומות אחרונים״</td><td>{e.last_call || 0}</td></tr>
              <tr><td>מייל הוראות הגעה</td><td>{e.arrival || 0}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="rt-card">
          <h2>סקר המשוב</h2>
          <table className="rt-table">
            <tbody>
              <tr><td>נשלח</td><td>{s.survey_sent}</td></tr>
              <tr><td>השיבו</td><td>{s.responded}</td><td>{pct(s.responded, s.survey_sent)}</td></tr>
              <tr className="hl"><td>ביקשו פגישת המשך</td><td>{s.meeting_yes}</td><td /></tr>
            </tbody>
          </table>
          <a className="rt-link" href="/admin/survey">לתוצאות המלאות ←</a>
        </section>

        <section className="rt-card">
          <h2>לא הגיעו: נדחו, ביטלו וסירבו</h2>
          <table className="rt-table">
            <tbody>
              <tr className="hl-bad">
                <td>בקשות הרשמה שנדחו ע״י המארגנים</td>
                <td>{d.rejected.length}</td>
                <td>{pct(d.rejected.length, s.registered)}</td>
              </tr>
              <tr><td>מתוכם קיבלו מייל דחייה</td><td>{d.notified}</td><td /></tr>
              <tr><td>ביטלו אחרי שאושרו (מייל / טלפון)</td><td>{d.cancelled}</td><td /></tr>
              <tr><td>סימנו בטופס שלא יגיעו</td><td>{d.said_no}</td><td /></tr>
              <tr><td>אחר (סירוב בהזמנה הקולית / עדכון ידני)</td><td>{d.other}</td><td /></tr>
              <tr><td><b>סה״כ בסטטוס ״לא מגיע/ה״</b></td><td>{d.total}</td><td /></tr>
            </tbody>
          </table>
          {d.rejectedOrgs.length > 0 && (
            <div className="rt-sub-list">
              <b>הבקשות שנדחו לפי ארגון:</b>{' '}
              {d.rejectedOrgs.map((o) => `${o.organization} (${o.n})`).join(' · ')}
            </div>
          )}
          {d.rejected.length > 0 && (
            <details className="rt-details">
              <summary>שמות ({d.rejected.length})</summary>
              <ul className="rt-orgs">
                {d.rejected.map((r, i) => (
                  <li key={i}>
                    {r.full_name || '—'} <span className="muted">· {r.organization || '—'}{r.role ? ` · ${r.role}` : ''}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="rt-card">
          <h2>הארגונים עם הכי הרבה משתתפים</h2>
          <ol className="rt-orgs">
            {data.topOrgs.map((o) => (
              <li key={o.organization}>
                {o.organization} <b>{o.n}</b>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <h2 className="rt-section">נושאים לדיון</h2>
      <div className="rt-topics">
        {TOPICS.map((t) => (
          <NoteBox key={t.key} topic={t} initial={notes[t.key]?.body} initialAt={notes[t.key]?.updated_at} />
        ))}
      </div>
    </div>
  );
}
