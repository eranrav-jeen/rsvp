// Read-only rendering of a stage cue card, shared by the admin page and the
// public share page. Text markup: **bold**, "- " bullets, ___ blanks.

// Light markup: **bold**, ___ = blank to fill in.
export function Inline({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|_{3,})/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <b key={i}>{part.slice(2, -2)}</b>;
    if (/^_{3,}$/.test(part)) return <span key={i} className="cue-fill" />;
    return part;
  });
}

// Lines → paragraphs; consecutive lines starting with "- " → a bullet list.
export function RichText({ text }) {
  if (!text) return null;
  const blocks = [];
  let list = null;
  for (const raw of String(text).split('\n')) {
    const line = raw.trimEnd();
    if (/^\s*-\s+/.test(line)) {
      if (!list) {
        list = [];
        blocks.push(list);
      }
      list.push(line.replace(/^\s*-\s+/, ''));
    } else {
      list = null;
      if (line.trim()) blocks.push(line);
    }
  }
  return blocks.map((b, i) =>
    Array.isArray(b) ? (
      <ul key={i}>
        {b.map((li, j) => (
          <li key={j}>
            <Inline text={li} />
          </li>
        ))}
      </ul>
    ) : (
      <p key={i}>
        <Inline text={b} />
      </p>
    )
  );
}

export function CueCardView({ card, n, total, onEdit, onUp, onDown }) {
  return (
    <article className="cue-card">
      <div className="cue-band">
        {card.time_label && <span className="cue-time">{card.time_label}</span>}
        <span className="cue-title">{card.title}</span>
        {card.who && <span className="cue-who">{card.who}</span>}
        <span className="cue-n">
          {n}/{total}
        </span>
        {onEdit && (
        <span className="cue-actions">
          <button className="icon-btn" title="הזזה למעלה" disabled={!onUp} onClick={onUp || undefined}>
            ▲
          </button>
          <button className="icon-btn" title="הזזה למטה" disabled={!onDown} onClick={onDown || undefined}>
            ▼
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onEdit}>
            עריכה
          </button>
        </span>
        )}
      </div>
      <div className="cue-body">
        {card.say && (
          <div className="cue-say">
            <RichText text={card.say} />
          </div>
        )}
        {card.question && (
          <>
            <div className="cue-label">שאלה</div>
            <div className="cue-q">
              <Inline text={card.question} />
            </div>
          </>
        )}
        {card.follow && (
          <div className="cue-follow">
            <b>שאלת המשך: </b>
            <Inline text={card.follow} />
          </div>
        )}
        {card.notes && (
          <div className="cue-notes">
            <RichText text={card.notes} />
          </div>
        )}
      </div>
    </article>
  );
}

