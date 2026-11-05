import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AiTag } from '../components/AiTag';
import { HumanTag } from '../components/HumanTag';
import { Confidence } from '../components/Confidence';
import { StatusIcon, StatusPill } from '../components/StatusIcon';
import { CHECKS, DOCS, XFIELDS, buildRequestDraft } from '../data/intake';
import { dobResolved, useDemo } from '../store';

export default function Intake() {
  const { state } = useDemo();
  const { decision, requestSent } = state.intake;
  const pending = (decision === 'pending' || decision === 'editing' ? 1 : 0) + (requestSent ? 0 : 1);

  return (
    <>
      <div className="page-h">
        <div className="titles">
          <div className="eyebrow">שלב 2 מתוך 5</div>
          <h1>השוואה ואימות מסמכים</h1>
          <p>הבקשה התקבלה ב-02.11.2026 בטופס המקוון. ה-AI עיבד 9 מסמכים והריץ 8 בדיקות תוך 2:14 דקות. כל ממצא ממתין לאישורך.</p>
        </div>
        <div className="summary-chips" aria-label="סיכום בדיקות">
          <span className="pill ok"><Icon name="check" size={13} />4 אומתו</span>
          <span className="pill warn"><Icon name="alert" size={13} />2 לבדיקה</span>
          <span className="pill miss"><Icon name="x" size={13} />1 חסר</span>
        </div>
      </div>

      <div className="split">
        <AiPanel />
        <DocViewer />
      </div>

      <CrossCheck />
      <Mismatch />

      <div className="sticky-foot">
        <div className="txt">
          <b aria-live="polite">החלטות ממתינות לאישורך: {pending}</b>
          <div>כל הצעת AI והחלטה אנושית נשמרות ביומן הביקורת של התיק.</div>
        </div>
        <Link to="/file" className="btn btn-primary btn-lg">
          אשר והמשך לפתיחת תיק <Icon name="arrow" size={18} />
        </Link>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function AiPanel() {
  const { setIntake, state } = useDemo();
  return (
    <section className="card ai-panel" aria-labelledby="checks-h">
      <div className="card-h">
        <Icon name="sparkle" size={16} filled className="ico-ai" />
        <h2 id="checks-h">רשימת בדיקות AI</h2>
        <span className="meta">עודכן לפני 3 דק׳ · 8 בדיקות</span>
      </div>
      {CHECKS.map((c) => (
        <div key={c.title} className={`check ${c.status}`}>
          <StatusIcon status={c.status} />
          <div className="check-body">
            <div className="check-title">
              <b>{c.title}</b>
              <StatusPill status={c.status} />
              <span className="end"><AiTag /><Confidence value={c.conf} /></span>
            </div>
            <p dir="auto" style={{ textAlign: 'start' }}>{c.text}</p>
            {c.link && (
              <button
                type="button" className="link"
                onClick={() => setIntake({ doc: c.link!.doc, hl: c.link!.field, hlSeq: state.intake.hlSeq + 1 })}
              >
                <Icon name="eye" size={14} />הצג במקור: {c.link.label}
              </button>
            )}
          </div>
        </div>
      ))}
      <RequestDraft />
    </section>
  );
}

function RequestDraft() {
  const { state, setIntake } = useDemo();
  const { requestSent, editingDraft, draft } = state.intake;
  const auto = buildRequestDraft(dobResolved(state));
  const text = draft ?? auto;

  return (
    <div className="req">
      <div className="req-h">
        <span className="status-ico navy" aria-hidden="true"><Icon name="send" size={13} /></span>
        <b>במידת הצורך – בקשה להשלמת מסמכים</b>
        <AiTag label="טיוטה הוצעה ע״י AI" />
      </div>
      {requestSent ? (
        <div className="sent-row">
          <span className="status-ico ok" aria-hidden="true"><Icon name="check" size={14} /></span>
          <b>הבקשה נשלחה לבני הזוג · 13:06</b>
          <HumanTag text="נשלח ע״י רונית כהן" />
          <button type="button" className="link push" onClick={() => setIntake({ requestSent: false })}>הצג נוסח</button>
        </div>
      ) : (
        <>
          <div className="ai-box">
            <div className="req-meta">
              אל: <span dir="ltr">Maria Santos</span>, דניאל לוי · ערוץ: אזור אישי + SMS + דוא״ל · מועד להשלמה: 19.11.2026
            </div>
            {editingDraft ? (
              <>
                <label className="field-label" htmlFor="draft-ta">נוסח הבקשה</label>
                <textarea
                  id="draft-ta" className="textarea" rows={11} value={text}
                  onChange={(e) => setIntake({ draft: e.target.value })}
                />
              </>
            ) : (
              <div className="pre">{text}</div>
            )}
          </div>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={() => setIntake({ requestSent: true, editingDraft: false })}>
              <Icon name="send" size={16} />שלח בקשה
            </button>
            <button
              type="button" className="btn btn-secondary"
              onClick={() => editingDraft
                ? setIntake({ editingDraft: false, draft: draft === auto ? null : draft })
                : setIntake({ editingDraft: true })}
            >
              <Icon name="pencil" size={16} />{editingDraft ? 'סיום עריכה' : 'ערוך טיוטה'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DocViewer() {
  const { state, setIntake } = useDemo();
  const { doc: docId, hl, hlSeq } = state.intake;
  const doc = DOCS.find((d) => d.id === docId) ?? DOCS[0];
  const hlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hl && hlRef.current) hlRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [hl, docId, hlSeq]);

  return (
    <section className="card viewer" aria-labelledby="docs-h">
      <div className="card-h">
        <Icon name="file" size={16} className="ico-navy" />
        <h2 id="docs-h">מסמכי הבקשה</h2>
        <span className="meta">9 מסמכים · OCR ותרגום אוטומטי</span>
      </div>
      <div className="tabs" role="tablist" aria-label="מסמכים">
        {DOCS.map((d) => (
          <button
            key={d.id} type="button" role="tab" id={`tab-${d.id}`}
            aria-selected={d.id === doc.id} aria-controls="doc-panel"
            className="tab" onClick={() => setIntake({ doc: d.id, hl: '' })}
          >
            {d.tab}
            {d.flagged && (
              <>
                <span className="dot amber" aria-hidden="true" />
                <span className="sr-only">דורש בדיקה</span>
              </>
            )}
          </button>
        ))}
      </div>
      <div className="stage" role="tabpanel" id="doc-panel" aria-labelledby={`tab-${doc.id}`}>
        <article className="paper">
          <div className="paper-h">
            <div>
              <div className="paper-origin">{doc.origin}</div>
              <div className="paper-title" dir="auto" style={{ textAlign: 'start' }}>{doc.title}</div>
            </div>
            <span className="ocr" dir="ltr">OCR {doc.ocr}%</span>
          </div>
          {doc.gallery && (
            <div className="gallery">
              {doc.gallery.map((g) => (
                <figure key={g}>
                  <div className="ph"><Icon name="image" size={22} /></div>
                  <figcaption>{g}</figcaption>
                </figure>
              ))}
            </div>
          )}
          <div className="paper-body">
            {doc.photo && (
              <div className="photo" role="img" aria-label="תמונת בעלת הדרכון (מקום שמור)"><Icon name="user" size={36} /></div>
            )}
            <div className="fields">
              {doc.fields.map((f) => {
                const isHl = !!hl && f.key === hl;
                const tint = doc.id === 'marriage' && f.key === 'dob';
                return (
                  <div key={f.label} ref={isHl ? hlRef : undefined} className={`fld${isHl ? ' hl' : tint ? ' tint' : ''}`}>
                    <div className="fld-l">{f.label}</div>
                    <div className="fld-v" dir="auto">{f.value}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {doc.mrz && <div className="mrz" aria-label="אזור MRZ">{doc.mrz}</div>}
          {doc.stamp && (
            <div className="stamp">
              <span className="stamp-c" aria-hidden="true">APOSTILLE</span>
              <span>{doc.stamp}</span>
            </div>
          )}
          <div className="paper-foot">{doc.footer}</div>
        </article>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function CrossCheck() {
  const { state } = useDemo();
  const resolved = dobResolved(state);
  return (
    <section className="card" aria-labelledby="xc-h">
      <div className="card-h">
        <h2 id="xc-h">שדות שחולצו והצלבה בין מסמכים</h2>
        <AiTag />
        <span className="meta">פרטי המוזמנת · <span dir="ltr">Maria Santos</span></span>
      </div>
      <div className="xgrid">
        {XFIELDS.map((x) => {
          const isDob = x.label === 'תאריך לידה';
          const tone = isDob && resolved ? 'navy' : x.tone;
          const value = isDob && state.intake.decision === 'edited' ? state.intake.editVal : x.value;
          return (
            <div key={x.label} className={`xcard${tone === 'ok' ? '' : ` ${tone}`}`}>
              <div className="xcard-l"><span>{x.label}</span><span>ביטחון {x.conf}%</span></div>
              <div className="xcard-v">{value}</div>
              {x.sources.map((s) => (
                <div key={s.name} className={`xsrc${s.bad ? ' bad' : ''}`}>
                  <span>{s.name}</span><span className="v">{s.value}</span>
                </div>
              ))}
              <div className={`xstatus ${tone}`}>
                {tone === 'navy' ? <><Icon name="user" size={13} />הוכרע ע״י רונית כהן</>
                  : tone === 'warn' ? <><Icon name="alert" size={13} />{x.status}</>
                  : <><Icon name="check" size={13} />{x.status}</>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const DECISION_PILL = {
  pending: { cls: 'warn', text: 'ממתין להכרעתך' },
  editing: { cls: 'navy', text: 'בעריכה' },
  approved: { cls: 'ok', text: 'אושר' },
  edited: { cls: 'ok', text: 'נערך ואושר' },
  rejected: { cls: 'miss', text: 'נדחה' },
} as const;

function Mismatch() {
  const { state, setIntake } = useDemo();
  const { decision, editVal, editNote, hlSeq } = state.intake;
  const pill = DECISION_PILL[decision];
  const show = (doc: string) => setIntake({ doc, hl: 'dob', hlSeq: hlSeq + 1 });

  return (
    <section className="card warn" aria-labelledby="mm-h">
      <div className="card-h" style={{ marginBottom: 0 }}>
        <Icon name="alert" size={18} className="ico-warn" />
        <h2 id="mm-h">אי-התאמה בתאריך הלידה של המוזמנת</h2>
        <AiTag label="זוהה ע״י AI" />
        <Confidence value={93} prefix="ביטחון" />
        <span className={`pill ${pill.cls} push`} aria-live="polite">{pill.text}</span>
      </div>

      <div className="compare">
        <div className="cbox">
          <div className="src">דרכון ברזילאי (מסמך ביומטרי) · גם בתעודת לידה ובטופס המקוון</div>
          <div className="val ok">14.03.1994</div>
          <button type="button" className="link" onClick={() => show('passport')}><Icon name="eye" size={14} />הצג בדרכון</button>
        </div>
        <div className="cbox warn">
          <div className="src">תעודת נישואין · לרנקה, קפריסין · 18.06.2024</div>
          <div className="val warn">14.08.1994</div>
          <button type="button" className="link" onClick={() => show('marriage')}><Icon name="eye" size={14} />הצג בתעודת הנישואין</button>
        </div>
      </div>

      <div className="ai-box ai-explain">
        <h4><Icon name="sparkle" size={13} filled />הסבר AI</h4>
        <p>תאריך הדרכון תואם 3 מתוך 4 מקורות. ככל הנראה זו שגיאת רישום בתעודת הנישואין: החודש 03 נרשם כ-08. אין סימנים לזיוף. הצעה: לרשום בתיק 14.03.1994 ולבקש תעודת נישואין מתוקנת. הבקשה תתווסף אוטומטית לטיוטה.</p>
      </div>

      {decision === 'pending' && (
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => setIntake({ decision: 'approved', editVal: '14.03.1994' })}>
            <Icon name="check" size={16} />אשר הצעה
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setIntake({ decision: 'editing' })}>
            <Icon name="pencil" size={16} />ערוך
          </button>
          <button type="button" className="btn btn-secondary btn-danger" onClick={() => setIntake({ decision: 'rejected' })}>
            <Icon name="x" size={16} />דחה
          </button>
        </div>
      )}

      {decision === 'editing' && (
        <form onSubmit={(e) => { e.preventDefault(); setIntake({ decision: 'edited' }); }}>
          <div className="edit-grid">
            <div>
              <label className="field-label" htmlFor="dob-val">תאריך לידה לרישום בתיק</label>
              <input
                id="dob-val" className="input mono" dir="ltr" value={editVal} required
                onChange={(e) => setIntake({ editVal: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="dob-note">נימוק (יישמר ביומן הביקורת)</label>
              <input
                id="dob-note" className="input" value={editNote} placeholder="למשל: אומת טלפונית מול לשכת הנישואין"
                onChange={(e) => setIntake({ editNote: e.target.value })}
              />
            </div>
          </div>
          <div className="actions">
            <button type="submit" className="btn btn-primary"><Icon name="check" size={16} />שמור החלטה</button>
            <button type="button" className="btn btn-secondary" onClick={() => setIntake({ decision: 'pending' })}>ביטול</button>
          </div>
        </form>
      )}

      {(decision === 'approved' || decision === 'edited' || decision === 'rejected') && (
        <div className="decided">
          <HumanTag text="הוכרע ע״י רונית כהן · 13:04" />
          <span>
            {decision === 'approved' && 'נרשם בתיק 14.03.1994. בקשה לתעודת נישואין מתוקנת נוספה לטיוטה.'}
            {decision === 'edited' && <>נרשם בתיק <span className="mono" dir="ltr">{editVal}</span>{editNote.trim() ? ` · ${editNote.trim()}` : ''}.</>}
            {decision === 'rejected' && 'הצעת ה-AI נדחתה. הנושא יועבר לבירור בראיון.'}
          </span>
          <button type="button" className="link push" onClick={() => setIntake({ decision: 'pending' })}>בטל החלטה</button>
        </div>
      )}
    </section>
  );
}
