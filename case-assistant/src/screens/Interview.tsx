import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AiTag } from '../components/AiTag';
import { HumanTag } from '../components/HumanTag';
import { CONTRADICTIONS, COVERAGE, MESSAGES, QUESTIONS, TOPIC_LABEL, type Contradiction, type Topic } from '../data/interview';
import { MESSAGE_COUNT, useDemo, type CState, type DemoState } from '../store';

const pad = (n: number) => String(n).padStart(2, '0');
const fmtClock = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

function visibleContradictions(revealed: number) {
  return CONTRADICTIONS.filter((c) => c.msgs.every((i) => i < revealed));
}

export default function Interview() {
  const { state, dispatch, setInterview } = useDemo();
  const { paused, clock, revealed } = state.interview;

  // Live clock: ticks every second unless transcription is paused.
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => window.clearInterval(id);
  }, [paused, dispatch]);

  // Demo playback: reveal transcript messages one by one.
  useEffect(() => {
    if (paused || revealed >= MESSAGE_COUNT) return;
    const id = window.setTimeout(() => setInterview({ revealed: revealed + 1 }), revealed === 0 ? 500 : 2500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, revealed]);

  return (
    <>
      <section className="card session" aria-label="פרטי הראיון">
        <span className="pill live"><span className="dot red pulse" aria-hidden="true" />ראיון חי</span>
        <span className="timer" role="timer" aria-label="משך הראיון" dir="ltr">{fmtClock(clock)}</span>
        <div className="grow" style={{ minWidth: 260 }}>
          <h1>ראיון בני הזוג · ראיונות נפרדים</h1>
          <div className="sub">
            חדר א׳: דניאל לוי · חדר ב׳: <span dir="ltr">Maria Santos</span> (פורטוגזית/אנגלית, מתורגמנית נוכחת) · התמלול בהסכמת המרואיינים
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn btn-secondary" aria-pressed={paused} onClick={() => setInterview({ paused: !paused })}>
            <Icon name="mic" size={16} />{paused ? 'חדש תמלול' : 'השהה תמלול'}
          </button>
          <Link to="/decision" className="btn btn-primary">
            סיים ראיון והמשך להכרעה <Icon name="arrow" size={16} />
          </Link>
        </div>
      </section>

      <div className="cols">
        <Transcript />
        <Questions />
        <Contradictions />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Transcript() {
  const { state, setInterview } = useDemo();
  const { lang, revealed, paused } = state.interview;
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (box.current) box.current.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
  }, [revealed]);

  const shown = MESSAGES.slice(0, revealed);
  const done = revealed >= MESSAGE_COUNT;
  const nextSpeaker = !done ? MESSAGES[revealed] : MESSAGES[MESSAGE_COUNT - 1];
  const speaking = nextSpeaker.who === 'm' ? 'Maria מדברת' : nextSpeaker.who === 'd' ? 'דניאל מדבר' : 'המראיינת מדברת';

  return (
    <section className="card col-t" aria-labelledby="tr-h">
      <div className="card-h">
        <h2 id="tr-h">תמלול חי</h2>
        <AiTag label="תמלול ותרגום AI" />
        <span className="push seg" role="group" aria-label="שפת התצוגה">
          <button type="button" aria-pressed={lang === 'he'} onClick={() => setInterview({ lang: 'he' })}>עברית</button>
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setInterview({ lang: 'en' })} lang="en">English</button>
        </span>
      </div>
      <div className="msgs" ref={box} aria-live="polite">
        {shown.map((m, i) => (
          <div key={i} className={`msg${m.who === 'i' ? '' : ' partner'}`}>
            <div className="msg-meta">
              <span className={`av ${m.who}`} aria-hidden="true">{m.av}</span>
              <b dir="auto">{m.name}</b>
              <span>{m.room} · {m.time}</span>
              {m.flag && <span className="pill warn">סתירה #{m.flag}</span>}
            </div>
            <div
              className={`bubble ${m.who}${m.flag ? ' flag' : ''}`}
              dir={lang === 'en' ? 'ltr' : 'rtl'} lang={lang}
            >
              {lang === 'en' ? m.en : m.he}
            </div>
          </div>
        ))}
      </div>
      <div className="live-line">
        {paused ? (
          <><span className="dot" style={{ background: 'var(--gray-400)' }} aria-hidden="true" /><span className="muted">התמלול מושהה</span></>
        ) : (
          <><span className="dot ai pulse" aria-hidden="true" />{done ? 'Maria מדברת' : speaking} · מתמלל ומתרגם…</>
        )}
        {!done && (
          <button type="button" className="link push" onClick={() => setInterview({ revealed: MESSAGE_COUNT })}>הצג הכל</button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const FILTERS: ('all' | Topic)[] = ['all', 'met', 'routine', 'family', 'home'];

function coverage(s: DemoState) {
  return COVERAGE.map((c) => ({ ...c, pct: s.interview.q[c.q] === 'asked' ? c.boosted : c.base }));
}

function Questions() {
  const { state, setInterview } = useDemo();
  const { topic, q, lang } = state.interview;
  const list = QUESTIONS.filter((x) => topic === 'all' || x.topic === topic);

  return (
    <section className="card col-q" aria-labelledby="q-h">
      <div className="card-h">
        <h2 id="q-h">שאלות המשך מוצעות</h2>
        <AiTag />
        <span className="meta row" style={{ gap: 6 }}><span className="dot ai pulse" aria-hidden="true" />מתעדכן בזמן אמת</span>
      </div>
      <div className="filters" role="group" aria-label="סינון לפי נושא">
        {FILTERS.map((f) => (
          <button key={f} type="button" className="fpill" aria-pressed={topic === f} onClick={() => setInterview({ topic: f })}>
            {f === 'all' ? 'הכל' : TOPIC_LABEL[f]}
          </button>
        ))}
      </div>
      <div>
        {list.map((x) => {
          const st = q[x.id];
          return (
            <article key={x.id} className={`qcard${st === 'skipped' ? ' skipped' : ''}`}>
              <div className="row">
                <span className="chip">{TOPIC_LABEL[x.topic]}</span>
                <span className="to">לשאול את: <span dir="auto">{x.to}</span></span>
                <span className="conf push">ביטחון {x.conf}%</span>
              </div>
              <div className="q" dir={lang === 'en' ? 'ltr' : 'rtl'} lang={lang}>{lang === 'en' ? x.en : x.he}</div>
              <div className="why">{x.reason}</div>
              {st === 'open' ? (
                <div className="row" style={{ marginTop: 4 }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setInterview({ q: { ...q, [x.id]: 'asked' } })}>
                    <Icon name="check" size={14} />סמן כנשאלה
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setInterview({ q: { ...q, [x.id]: 'skipped' } })}>דלג</button>
                </div>
              ) : (
                <div className="row" style={{ marginTop: 4 }}>
                  <HumanTag text={st === 'asked' ? 'נשאלה ע״י רונית כהן' : 'דולגה ע״י רונית כהן'} />
                  <button type="button" className="link" onClick={() => setInterview({ q: { ...q, [x.id]: 'open' } })}>בטל</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <div className="cov">
        <h3>כיסוי נושאים</h3>
        {coverage(state).map((c) => (
          <div key={c.topic} className="cov-row">
            <span className="l">{TOPIC_LABEL[c.topic]}</span>
            <span className="cov-track" role="img" aria-label={`${TOPIC_LABEL[c.topic]}: ${c.pct}%`}><span style={{ width: `${c.pct}%` }} /></span>
            <span className="p">{c.pct}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const CLOSED_TEXT: Record<Exclude<CState, 'open'>, string> = {
  explained: 'סומן כמוסבר ע״י רונית כהן',
  asked: 'הועבר לשאלת הבהרה ע״י רונית כהן',
  dismissed: 'סומן כלא רלוונטי ע״י רונית כהן',
};

function Contradictions() {
  const { state } = useDemo();
  const visible = visibleContradictions(state.interview.revealed);
  const open = visible.filter((c) => state.interview.c[String(c.n)] === 'open').length;

  return (
    <section className="card col-c" aria-labelledby="c-h">
      <div className="card-h">
        <Icon name="alert" size={17} className="ico-warn" />
        <h2 id="c-h">גלאי סתירות</h2>
        <AiTag label="זוהה ע״י AI" />
        <span className="meta" aria-live="polite">{open} פתוחות</span>
      </div>
      {visible.length === 0 && <p className="muted small">ממתין לתמלול… סתירות יוצגו כאן ברגע שיזוהו.</p>}
      {visible.map((c) => <ContradictionCard key={c.n} c={c} />)}

      <div className="consistent">
        <b><Icon name="check" size={14} />עקבי בין בני הזוג (4)</b>
        <div className="muted">שמות הורי דניאל · תאריך ומקום החתונה · חלוקת שכר הדירה · תוכניות לחגים</div>
      </div>
      <p className="disclaimer">ה-AI מסמן פערים לבירור בלבד ואינו קובע את כנות הקשר. ההערכה וההכרעה בידי המראיינת.</p>
    </section>
  );
}

function ContradictionCard({ c }: { c: Contradiction }) {
  const { state, setInterview } = useDemo();
  const st = state.interview.c[String(c.n)];
  const set = (v: CState) => setInterview({ c: { ...state.interview.c, [c.n]: v } });

  return (
    <article className={`ccard${st === 'open' ? '' : ' closed'}`}>
      <div className="hd">
        <b>סתירה #{c.n}</b>
        <span className={`pill ${c.sev === 'high' ? 'miss' : 'warn'}`}>{c.sev === 'high' ? 'חומרה גבוהה' : 'חומרה בינונית'}</span>
        <span className="chip">{TOPIC_LABEL[c.topic]}</span>
        <span className="small muted push">{c.kind}</span>
      </div>
      <div className="quotes">
        {[c.a, c.b].map((x) => (
          <div key={x.who} className="quote">
            <div className="who" dir="auto">{x.who}</div>
            <div>{x.text}</div>
          </div>
        ))}
      </div>
      <div className="ev"><b>במסמכים:</b> {c.docs}</div>
      <div className="ai-note">{c.note}</div>
      {st === 'open' ? (
        <div className="row">
          <button
            type="button" className="btn btn-primary btn-sm"
            onClick={() => setInterview({
              c: { ...state.interview.c, [c.n]: 'asked' },
              q: { ...state.interview.q, [c.q]: 'asked' },
              topic: 'all',
            })}
          >שאל שאלת הבהרה</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => set('explained')}>סמן כמוסבר</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => set('dismissed')}>לא רלוונטי</button>
        </div>
      ) : (
        <div className="row">
          <HumanTag text={CLOSED_TEXT[st]} />
          <button type="button" className="link" onClick={() => set('open')}>בטל</button>
        </div>
      )}
    </article>
  );
}
