import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AiTag } from '../components/AiTag';
import { HumanTag } from '../components/HumanTag';
import { Confidence } from '../components/Confidence';
import { useDemo } from '../store';

const FACTORS: { text: string; v: number }[] = [
  { text: 'כתובת מגורים שונה מהרשום במרשם', v: 10 },
  { text: 'מסמך חסר: תעודת יושר לקטין מעל 14', v: 10 },
  { text: 'בקשה קודמת לבת זוג זרה (2017)', v: 8 },
  { text: 'אי-התאמה בתאריך לידה (הוכרעה)', v: 6 },
  { text: 'חוזה וחשבון בנק משותפים מ-2024', v: -8 },
  { text: 'רצף תיעוד קשר מ-09/2022', v: -6 },
];

const RECORDS: { ok: boolean; title: string; desc: string; status: string }[] = [
  { ok: true, title: 'מרשם האוכלוסין · דניאל לוי', desc: 'נוסף קישור לבקשת מעמד לבת זוג. רישום נישואין בחו״ל סומן לעדכון.', status: 'עודכן' },
  { ok: true, title: 'רשומת זר · Maria Clara Santos', desc: 'נפתחה בקשה, מקושרת לדרכון FX482913 ולאשרת B/2.', status: 'עודכן' },
  { ok: false, title: 'רשומת קטין · Lucas Santos (15)', desc: 'קושר כנלווה. ממתין לתעודת יושר.', status: 'ממתין למסמך' },
  { ok: true, title: 'היסטוריית מעברי גבול', desc: '3 כניסות ו-2 יציאות צורפו לתיק.', status: 'עודכן' },
  { ok: true, title: 'בקשה קודמת 2017', desc: 'קושרה לעיון. נסגרה ב-2018 בעקבות פרידה.', status: 'קושר' },
];

const INDEX: { doc: string; cat: string; date: string; state: string; tone?: 'warn' | 'miss' }[] = [
  { doc: 'דרכון', cat: 'זיהוי', date: '23.09.2021', state: 'מאומת' },
  { doc: 'תעודת לידה', cat: 'מצב אישי', date: '03.2026', state: 'מאומת' },
  { doc: 'תעודת נישואין', cat: 'מצב אישי', date: '18.06.2024', state: 'מתוקנת נדרשת', tone: 'warn' },
  { doc: 'אפוסטיל', cat: 'אימות', date: '25.06.2024', state: 'מאומת' },
  { doc: 'תעודת יושר – Maria', cat: 'פלילי', date: '08.08.2026', state: 'מאומת' },
  { doc: 'תעודת יושר – Lucas', cat: 'פלילי', date: '—', state: 'נדרש', tone: 'miss' },
  { doc: 'דף חשבון בנק', cat: 'מרכז חיים', date: '10.2026', state: 'מאומת' },
  { doc: 'חוזה שכירות', cat: 'מרכז חיים', date: '14.03.2024', state: 'מאומת' },
  { doc: 'תמונות (46)', cat: 'כנות הקשר', date: '2022–2026', state: 'אונדקס' },
  { doc: 'התכתבויות', cat: 'כנות הקשר', date: '2022–2026', state: 'אונדקס' },
];

const FOCUS = [
  { chip: 'איך הכירו', prio: 'גבוהה', title: 'נסיבות ההיכרות וציר הזמן', reason: 'ההתכתבות הראשונה מ-09/2022 ותמונה מתל אביב מ-11/2022. מומלץ לאמת את גרסת שני בני הזוג בנפרד.' },
  { chip: 'הסדרי מגורים', prio: 'גבוהה', title: 'כתובת המגורים בפועל', reason: 'החוזה וחשבון הבנק מציינים רמת גן, המרשם מציין תל אביב. לברר מתי עברו ומדוע לא עודכן.' },
  { chip: 'שגרה יומית', prio: 'בינונית', title: 'שגרה ותעסוקה', reason: 'שני בני הזוג מפקידים שכר. לבדוק היכרות הדדית עם מקום העבודה וסדר היום.' },
  { chip: 'היכרות עם המשפחה', prio: 'בינונית', title: 'המשפחה והבן Lucas', reason: 'לברר היכן מתגורר Lucas והיכרות של דניאל עמו ושל Maria עם הוריו של דניאל.' },
  { chip: 'רקע', prio: 'נמוכה', title: 'הבקשה הקודמת מ-2017', reason: 'שאלה קצרה לדניאל על נסיבות סגירת הבקשה הקודמת.' },
];

export default function CaseFile() {
  return (
    <>
      <div className="page-h">
        <div className="titles">
          <div className="eyebrow">שלב 3 מתוך 5</div>
          <h1>התיק הממוחשב נפתח</h1>
          <p>לאחר אישורך, ה-AI עדכן את הרשומות המקושרות, ביצע אינדוקס למסמכים והכין סיכום ומיקודים לראיון. אפשר לשנות כל פריט לפני הראיון.</p>
        </div>
        <div className="opened">
          <span className="status-ico ok" aria-hidden="true"><Icon name="check" size={14} /></span>
          <b>נפתח 05.11.2026 · 13:07</b>
          <HumanTag text="אושר ע״י רונית כהן" />
        </div>
      </div>

      <div className="row-cards">
        <section className="card ai f3" aria-labelledby="sum-h">
          <div className="card-h">
            <h2 id="sum-h">סיכום התיק</h2>
            <AiTag />
            <Confidence value={91} prefix="ביטחון" />
          </div>
          <p>
            דניאל לוי (35), אזרח ישראלי, מבקש מעמד עבור בת זוגו <span dir="ltr">Maria Clara Santos</span> (32), אזרחית ברזיל השוהה בישראל באשרת B/2 בתוקף. בני הזוג נישאו בלרנקה, קפריסין, ב-18.06.2024, ומתגוררים יחד ברמת גן מ-04/2024 לפי חוזה שכירות. לתיק מקושר בנה של Maria, <span dir="ltr">Lucas Santos</span> (15).
          </p>
          <div className="stats">
            <div className="stat"><div className="l">משך קשר מתועד</div><div className="v">4 שנים 2 ח׳</div></div>
            <div className="stat"><div className="l">מסמכים מאומתים</div><div className="v">9 / 10</div></div>
            <div className="stat"><div className="l">הכרעות אנושיות</div><div className="v">3</div></div>
            <div className="stat"><div className="l">פריטים פתוחים</div><div className="v">2</div></div>
          </div>
        </section>

        <section className="card f2" aria-labelledby="score-h">
          <div className="card-h">
            <h2 id="score-h">ציון תשומת לב</h2>
            <AiTag />
          </div>
          <div className="score">
            <span className="n">34</span><span className="of">/ 100</span>
            <span className="pill warn">בינוני-נמוך</span>
          </div>
          <div className="scorebar" role="img" aria-label="ציון 34 מתוך 100">
            <span style={{ background: '#DBEAFE' }} />
            <span style={{ background: '#FED7AA' }} />
            <span style={{ background: '#FDBA74' }} />
            <i className="marker" style={{ right: '34%' }} />
          </div>
          <ul className="factors">
            {FACTORS.map((f) => (
              <li key={f.text}>
                <span>{f.text}</span>
                <span className={`sv ${f.v > 0 ? 'up' : 'down'}`}>
                  <span className="sr-only">{f.v > 0 ? 'מעלה' : 'מוריד'}</span>
                  {f.v > 0 ? `+${f.v}` : `−${Math.abs(f.v)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="foot-note">הציון מסייע בתעדוף בלבד ואינו מהווה המלצה להחלטה.</p>
        </section>
      </div>

      <div className="row-cards">
        <section className="card f1" aria-labelledby="rec-h">
          <div className="card-h">
            <h2 id="rec-h">רשומות מקושרות עודכנו</h2>
            <AiTag label="בוצע ע״י AI" />
          </div>
          <ul className="rec-list">
            {RECORDS.map((r) => (
              <li key={r.title}>
                <span className={`status-ico ${r.ok ? 'ok' : 'warn'}`} aria-hidden="true">
                  <Icon name={r.ok ? 'check' : 'clock'} size={14} />
                </span>
                <div className="grow">
                  <div className="t" dir="auto" style={{ textAlign: 'start' }}>{r.title}</div>
                  <div className="d">{r.desc}</div>
                </div>
                <span className={`pill ${r.ok ? 'ok' : 'warn'}`}>{r.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card f1" aria-labelledby="idx-h">
          <div className="card-h">
            <h2 id="idx-h">מסמכים באינדקס</h2>
            <AiTag label="סווג ע״י AI" />
            <span className="meta">10 פריטים</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">מסמך</th><th scope="col">קטגוריה</th><th scope="col">תאריך</th><th scope="col">מצב</th></tr></thead>
              <tbody>
                {INDEX.map((r) => (
                  <tr key={r.doc}>
                    <td>{r.doc}</td>
                    <td><span className="chip">{r.cat}</span></td>
                    <td className="mono" dir="ltr" style={{ textAlign: 'right' }}>{r.date}</td>
                    <td><span className={`pill ${r.tone ?? 'ok'}`}>{r.state}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <FocusAreas />
      <AuditLog />

      <div className="sticky-foot">
        <div className="txt">
          <b>ראיון בני הזוג · היום 14:00 · חדר 3</b>
          <div>מתורגמנית פורטוגזית זמינה · התמלול והתרגום יופעלו בהסכמת המרואיינים</div>
        </div>
        <Link to="/intake" className="btn btn-secondary">חזרה לאימות מסמכים</Link>
        <Link to="/interview" className="btn btn-primary btn-lg">
          <Icon name="mic" size={18} />התחל ראיון
        </Link>
      </div>
    </>
  );
}

function FocusAreas() {
  const { state, setFile } = useDemo();
  const off = state.file.focusOff;
  const on = FOCUS.filter((_, i) => !off[i]).length;
  return (
    <section className="card" aria-labelledby="focus-h">
      <div className="card-h" style={{ marginBottom: 4 }}>
        <h2 id="focus-h">מיקודים מוצעים לראיון</h2>
        <AiTag />
        <span className="meta" aria-live="polite">בתסריט הראיון: {on} מתוך 5</span>
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        בחרי אילו נושאים ייכנסו לתסריט הראיון. ה-AI ישתמש בהם כדי להציע שאלות המשך בזמן אמת.
      </p>
      <div className="focus-grid">
        {FOCUS.map((f, i) => {
          const isOn = !off[i];
          return (
            <div key={f.title} className={`focus${isOn ? ' on' : ''}`}>
              <div className="row">
                <span className="chip">{f.chip}</span>
                <span className="small muted">עדיפות {f.prio}</span>
              </div>
              <div className="t">{f.title}</div>
              <div className="r">{f.reason}</div>
              <button
                type="button" className="toggle" aria-pressed={isOn}
                onClick={() => setFile({ focusOff: { ...off, [i]: isOn } })}
              >
                <span className="box" aria-hidden="true">{isOn && <Icon name="check" size={12} />}</span>
                {isOn ? 'בתסריט הראיון' : 'הוסף לתסריט'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AuditLog() {
  const { state } = useDemo();
  const { decision, editVal, editNote, requestSent, draft } = state.intake;

  const dobLine =
    decision === 'edited' ? `אישרה רישום תאריך לידה ${editVal} (נערך ידנית${editNote.trim() ? `: ${editNote.trim()}` : ''})`
    : decision === 'rejected' ? 'דחתה את הצעת ה-AI לתאריך הלידה. הנושא הועבר לבירור בראיון'
    : 'אישרה רישום תאריך לידה 14.03.1994 (הצעת AI)';
  // If the presenter skipped ahead without acting on screen 1, show the scripted defaults.
  const reqLine = `שלחה בקשה להשלמת מסמכים (טיוטת AI, ${requestSent && draft !== null ? 'עם עריכה' : 'ללא שינויים'})`;

  const items: { t: string; ai: boolean; text: string }[] = [
    { t: '13:07', ai: false, text: 'אישרה פתיחת תיק ממוחשב' },
    { t: '13:07', ai: true, text: 'עדכן 5 רשומות מקושרות ויצר אינדקס של 10 מסמכים' },
    { t: '13:06', ai: false, text: reqLine },
    { t: '13:04', ai: false, text: dobLine },
    { t: '12:58', ai: true, text: 'השלים 8 בדיקות אימות וסימן 3 פריטים לבדיקה' },
    { t: '12:56', ai: true, text: 'קלט 9 מסמכים מהטופס המקוון, OCR ותרגום' },
  ];

  return (
    <section className="card" aria-labelledby="audit-h">
      <div className="card-h"><h2 id="audit-h">יומן ביקורת</h2></div>
      <ol className="audit">
        {items.map((it, i) => (
          <li key={i}>
            <time>{it.t}</time>
            <span className={`actor ${it.ai ? 'ai' : 'human'}`}>{it.ai ? 'AI' : 'רונית כהן'}</span>
            <span>{it.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
