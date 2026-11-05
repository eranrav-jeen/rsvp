import { Icon } from '../components/Icon';
import { AiTag } from '../components/AiTag';
import { HumanTag } from '../components/HumanTag';
import { Confidence } from '../components/Confidence';
import { DECISION_LABEL, useDemo, type Choice } from '../store';

const AI_REASON =
  'תנאי הסף מתקיימים. אי-ההתאמה בתאריך הלידה הוכרעה כשגיאת רישום. הסתירות בראיון לגבי מגורים ותעסוקה הוסברו ונתמכות במסמכים. הסתירה לגבי מועד ההיכרות מוסברת חלקית, וקיימות ראיות לקשר רציף מ-2022. נדרשת השלמת תעודת יושר לקטין.';

const LETTER_HEADER = 'לכבוד דניאל לוי ו-Maria Clara Santos\nהנדון: בקשה למעמד לבת זוג זרה, תיק IL-SP-2026-048213\n\n';
const LETTER_FOOTER = '\n\nבברכה,\nרונית כהן, רכזת תיקים';
const LETTER_BODY: Record<Exclude<Choice, ''>, string> = {
  approve: 'לאחר בחינת הבקשה, המסמכים והראיון, הוחלט לאשר את הבקשה. Maria Clara Santos תקבל רישיון ישיבה זמני במסגרת ההליך המדורג לתקופה של [משך התקופה].',
  conditional: 'לאחר בחינת הבקשה, המסמכים והראיון, הוחלט לאשר את הבקשה בתנאים הבאים, שיש להשלים עד 05.12.2026:\n1. תעודת יושר עבור Lucas Santos, עם אפוסטיל ותרגום נוטריוני.\n2. תעודת נישואין מתוקנת.\n3. עדכון כתובת המגורים במרשם האוכלוסין.\nעם השלמת התנאים יונפק רישיון ישיבה זמני במסגרת ההליך המדורג.',
  hold: 'הטיפול בבקשה הושהה לצורך בירור נוסף בנושא נסיבות ההיכרות. ייקבע מועד לראיון השלמה, ותישלח הודעה בנפרד.',
  reject: 'לאחר בחינת הבקשה הוחלט לדחות אותה מהנימוקים הבאים: [נימוקים]. ניתן להגיש ערר בתוך [מועד] מיום קבלת מכתב זה.',
};

const STAGES: { l: string; m: number; a: number }[] = [
  { l: 'קליטה', m: 2, a: 0.2 },
  { l: 'אימות מסמכים', m: 5, a: 1.5 },
  { l: 'פתיחת תיק', m: 1.5, a: 0.3 },
  { l: 'ראיון', m: 4, a: 2.5 },
  { l: 'הכרעה', m: 2.5, a: 1.5 },
];

export default function Decision() {
  return (
    <>
      <div className="page-h">
        <div className="titles">
          <div className="eyebrow">שלב 5 מתוך 5</div>
          <h1>מתן הכרעה</h1>
          <p>ה-AI ריכז את הממצאים מכל השלבים והכין טיוטת המלצה ומכתב החלטה. ההחלטה, הנימוק והחתימה הם שלך בלבד.</p>
        </div>
      </div>
      <div className="dcols">
        <div className="dcol-r">
          <Recommendation />
          <Findings />
          <TimeChart />
        </div>
        <div className="dcol-l">
          <DecisionForm />
        </div>
      </div>
    </>
  );
}

function Recommendation() {
  return (
    <section className="card ai rec" aria-labelledby="rec-h2">
      <div className="row">
        <AiTag />
        <Confidence value={84} prefix="ביטחון" />
        <span className="small muted push">המלצה בלבד · אינה מחייבת</span>
      </div>
      <h2 id="rec-h2">אישור מותנה להליך המדורג</h2>
      <p>כל תנאי הסף מתקיימים או טופלו. הראיון לא העלה סתירה מהותית שלא הוסברה. ההמלצה מותנית בהשלמת מסמך פתוח אחד.</p>
      <div className="conds">
        <h3>תנאים מוצעים</h3>
        <ul>
          <li><Icon name="check" size={14} /><span>תעודת יושר עבור <span dir="ltr">Lucas Santos</span> (15), תוך 30 יום</span></li>
          <li><Icon name="check" size={14} /><span>תעודת נישואין מתוקנת (תאריך לידה)</span></li>
          <li><Icon name="check" size={14} /><span>עדכון כתובת מגורים במרשם האוכלוסין</span></li>
        </ul>
      </div>
    </section>
  );
}

function Findings() {
  const { state } = useDemo();
  const cs = Object.values(state.interview.c);
  const explained = cs.filter((v) => v === 'explained' || v === 'dismissed').length;
  const inquiry = cs.length - explained;
  const rows: { k: string; f: string; d: string; tone: string }[] = [
    { k: 'זיהוי המבקשים', f: 'אומת מול המרשם (98%)', d: 'אושר', tone: 'ok' },
    { k: 'רקע המוזמנת', f: 'ללא שהייה בלתי חוקית או הרחקות', d: 'אושר', tone: 'ok' },
    { k: 'רקע הישראלי', f: 'בקשה קודמת 2017 – לא מונעת', d: 'אושר', tone: 'ok' },
    { k: 'תוקף דרכון', f: 'בתוקף עד 09/2031', d: 'אושר', tone: 'ok' },
    { k: 'מצב אישי', f: 'אי-התאמה בתאריך לידה', d: 'הוכרע: שגיאת רישום', tone: 'navy' },
    { k: 'מניעה פלילית', f: 'חסרה תעודה לקטין מעל 14', d: 'נדרשה השלמה', tone: 'warn' },
    { k: 'כנות הקשר (ראיון)', f: '3 סתירות זוהו', d: `${explained} הוסברו · ${inquiry} בבירור`, tone: 'navy' },
  ];
  return (
    <section className="card" aria-labelledby="fnd-h">
      <div className="card-h"><h2 id="fnd-h">ממצאים לפי קריטריון</h2></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">קריטריון</th><th scope="col">ממצא AI</th><th scope="col">הכרעת רכזת</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k}>
                <td style={{ fontWeight: 500 }}>{r.k}</td>
                <td>{r.f}</td>
                <td><span className={`pill ${r.tone}`}>{r.d}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TimeChart() {
  const scale = (h: number) => `${(h / 5) * 100}%`;
  return (
    <section className="card" aria-labelledby="tc-h">
      <div className="card-h"><h2 id="tc-h">זמן טיפול לפי שלב</h2><span className="meta">בשעות</span></div>
      <div className="chart-legend">
        <span><i style={{ background: 'var(--gray-400)' }} />טיפול ידני</span>
        <span><i style={{ background: 'var(--ai-500)' }} />עם Jeen.ai</span>
      </div>
      {STAGES.map((s) => (
        <div key={s.l} className="chart-row" role="img" aria-label={`${s.l}: ${s.m} שעות ידני, ${s.a} שעות עם Jeen.ai`}>
          <span className="l">{s.l}</span>
          <span className="bars" aria-hidden="true">
            <span className="bar man" style={{ width: scale(s.m) }} />
            <span className="bar ai" style={{ width: scale(s.a) }} />
          </span>
          <span className="v" aria-hidden="true">{s.m} → {s.a}h</span>
        </div>
      ))}
      <div className="chart-row total">
        <span className="l">סה״כ</span>
        <span className="bars" />
        <span className="v">15 → 6h</span>
      </div>
    </section>
  );
}

function DecisionForm() {
  const { state, setDecision } = useDemo();
  const { choice, reason, confirmed, signed } = state.decision;

  if (signed && choice) {
    return (
      <section className="signed" aria-labelledby="signed-h" aria-live="polite">
        <div className="signed-h">
          <span className="c" aria-hidden="true"><Icon name="check" size={22} /></span>
          <div>
            <b id="signed-h">ההחלטה נחתמה ונשלחה · {DECISION_LABEL[choice]}</b>
            <span>נחתם דיגיטלית ע״י רונית כהן · 05.11.2026 · 15:12</span>
          </div>
        </div>
        <div className="stats">
          <div className="stat"><div className="l">זמן טיפול בפועל</div><div className="v">5:48 ש׳</div></div>
          <div className="stat"><div className="l">ממוצע ידני</div><div className="v">15 ש׳</div></div>
          <div className="stat"><div className="l">הכרעות אנושיות</div><div className="v">9</div></div>
        </div>
        <p className="reason"><b>נימוק:</b> {reason}</p>
        <button type="button" className="btn btn-secondary" onClick={() => setDecision({ signed: false })}>חזרה לעריכה (הדגמה)</button>
      </section>
    );
  }

  const hint = !choice ? 'בחרי החלטה' : !reason.trim() ? 'הוסיפי נימוק' : !confirmed ? 'אשרי את הצהרת הבדיקה' : 'מוכן לחתימה';
  const ready = hint === 'מוכן לחתימה';
  const letter = choice ? LETTER_HEADER + LETTER_BODY[choice] + LETTER_FOOTER : null;
  const opts: { v: Exclude<Choice, ''>; sub?: string }[] = [
    { v: 'approve' }, { v: 'conditional', sub: 'תואם להמלצת ה-AI' }, { v: 'hold' }, { v: 'reject' },
  ];

  return (
    <section className="card" aria-labelledby="dec-h">
      <div className="card-h">
        <HumanTag text="החלטה אנושית" />
        <h2 id="dec-h">החלטתך</h2>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (ready) { setDecision({ signed: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}>
        <fieldset className="choices">
          <legend>בחרי החלטה</legend>
          <div className="choice-grid">
            {opts.map((o) => (
              <label key={o.v} className="choice">
                <input type="radio" name="decision" value={o.v} checked={choice === o.v} onChange={() => setDecision({ choice: o.v })} />
                <span className="t">{DECISION_LABEL[o.v]}</span>
                {o.sub && <span className="s"><Icon name="sparkle" size={10} filled />{o.sub}</span>}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="lbl-row">
          <label htmlFor="reason">נימוק ההחלטה (חובה)</label>
          <button type="button" className="link ai" onClick={() => setDecision({ reason: AI_REASON })}>
            <Icon name="sparkle" size={12} filled />הכנס נימוק מוצע של AI
          </button>
        </div>
        <textarea
          id="reason" className="textarea" rows={5} value={reason} required aria-required="true"
          onChange={(e) => setDecision({ reason: e.target.value })}
        />

        <div className="letter">
          <div className="letter-h"><b>טיוטת מכתב החלטה</b><AiTag /></div>
          <div className="ai-box" aria-live="polite">
            {letter ? <div className="pre">{letter}</div> : <span className="placeholder">בחרי החלטה כדי ליצור טיוטת מכתב.</span>}
          </div>
        </div>

        <label className="cb">
          <input type="checkbox" checked={confirmed} onChange={(e) => setDecision({ confirmed: e.target.checked })} />
          <span>בדקתי את הממצאים ואת המסמכים. ההחלטה מתקבלת על דעתי, ולא באופן אוטומטי.</span>
        </label>

        <div className="sign-row">
          <button type="submit" className="btn btn-primary btn-lg" disabled={!ready} aria-describedby="sign-hint">
            <Icon name="pencil" size={18} />חתום ושלח החלטה
          </button>
          <span id="sign-hint" className={`hint${ready ? ' ready' : ''}`} aria-live="polite">{hint}</span>
        </div>
      </form>
    </section>
  );
}
