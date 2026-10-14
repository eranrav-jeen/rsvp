import { useEffect, useState } from 'react';
import { api } from '../../api.js';

// Stage cue cards for the event MC and the panel host. Every card is editable
// in place and saved to the server, so the whole team sees the same version.
// Printing (the "הדפסה" button) gives one A5-landscape card per page.

const DECKS = [
  { key: 'mc', label: 'מנחה האירוע' },
  { key: 'panel', label: 'הנחיית הפאנל' },
];

// Light markup: **bold**, ___ = blank to fill in.
function Inline({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|_{3,})/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <b key={i}>{part.slice(2, -2)}</b>;
    if (/^_{3,}$/.test(part)) return <span key={i} className="cue-fill" />;
    return part;
  });
}

// Lines → paragraphs; consecutive lines starting with "- " → a bullet list.
function RichText({ text }) {
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

export default function CueCards() {
  const [cards, setCards] = useState(null);
  const [deck, setDeck] = useState(() => {
    try {
      return localStorage.getItem('cueDeck') || 'mc';
    } catch {
      return 'mc';
    }
  });
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2200);
  };

  useEffect(() => {
    api
      .get('/api/cue-cards')
      .then((d) => setCards(d.cards))
      .catch(() => setError('לא הצלחנו לטעון את הכרטיסיות.'));
  }, []);

  function pickDeck(k) {
    setDeck(k);
    setEditingId(null);
    try {
      localStorage.setItem('cueDeck', k);
    } catch {
      /* ignore */
    }
  }

  const deckCards = (cards || []).filter((c) => c.deck === deck);

  async function save(id, patch) {
    const { card } = await api.patch(`/api/cue-cards/${id}`, patch);
    setCards((cs) => cs.map((c) => (c.id === id ? card : c)));
    setEditingId(null);
    showToast('הכרטיס נשמר');
  }

  async function add() {
    const { card } = await api.post('/api/cue-cards', { deck });
    setCards((cs) => [...cs, card]);
    setEditingId(card.id);
  }

  async function move(id, dir) {
    const { cards: next } = await api.post(`/api/cue-cards/${id}/move`, { dir });
    setCards(next);
  }

  async function remove(id) {
    await api.del(`/api/cue-cards/${id}`);
    setCards((cs) => cs.filter((c) => c.id !== id));
    setEditingId(null);
    showToast('הכרטיס נמחק');
  }

  return (
    <div className="cue-page">
      <h1>כרטיסיות הנחיה</h1>
      <p className="muted cue-intro">
        כרטיס לכל רגע על הבמה. לחיצה על ״עריכה״ פותחת את הכרטיס לעריכה, והשינויים נשמרים לכל הצוות. ״הדפסה״ מדפיסה
        את הכרטיסיות של הלשונית הפתוחה, כרטיס אחד בכל עמוד A5.
      </p>

      <div className="cue-toolbar">
        <div className="cue-tabs" role="tablist">
          {DECKS.map((d) => (
            <button
              key={d.key}
              role="tab"
              aria-selected={deck === d.key}
              className={deck === d.key ? 'active' : ''}
              onClick={() => pickDeck(d.key)}
            >
              {d.label}
              {cards && <span className="cue-count">{cards.filter((c) => c.deck === d.key).length}</span>}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button className="btn btn-sm btn-ghost" onClick={add}>
          + הוספת כרטיס
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => window.print()}>
          הדפסה
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {!cards && !error && <p className="muted">טוען…</p>}

      <div className="cue-deck">
        {deckCards.map((c, i) =>
          editingId === c.id ? (
            <CardEditor
              key={c.id}
              card={c}
              n={i + 1}
              total={deckCards.length}
              onSave={(patch) => save(c.id, patch).catch(() => showToast('השמירה נכשלה, נסו שוב'))}
              onCancel={() => setEditingId(null)}
              onDelete={() => remove(c.id).catch(() => showToast('המחיקה נכשלה, נסו שוב'))}
            />
          ) : (
            <CardView
              key={c.id}
              card={c}
              n={i + 1}
              total={deckCards.length}
              onEdit={() => setEditingId(c.id)}
              onUp={i > 0 ? () => move(c.id, -1) : null}
              onDown={i < deckCards.length - 1 ? () => move(c.id, 1) : null}
            />
          )
        )}
        {cards && deckCards.length === 0 && <p className="muted">אין כרטיסים בלשונית הזו. אפשר להוסיף כרטיס חדש.</p>}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function CardView({ card, n, total, onEdit, onUp, onDown }) {
  return (
    <article className="cue-card">
      <div className="cue-band">
        {card.time_label && <span className="cue-time">{card.time_label}</span>}
        <span className="cue-title">{card.title}</span>
        {card.who && <span className="cue-who">{card.who}</span>}
        <span className="cue-n">
          {n}/{total}
        </span>
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

const EDIT_FIELDS = [
  { key: 'say', label: 'מה אומרים', rows: 6 },
  { key: 'question', label: 'שאלה (מוצגת מודגשת)', rows: 3 },
  { key: 'follow', label: 'שאלת המשך', rows: 2 },
  { key: 'notes', label: 'הערות במה (לא נאמרות)', rows: 4 },
];

function CardEditor({ card, n, total, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState({
    time_label: card.time_label || '',
    title: card.title || '',
    who: card.who || '',
    say: card.say || '',
    question: card.question || '',
    follow: card.follow || '',
    notes: card.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <form className="cue-card cue-editing" onSubmit={submit}>
      <div className="cue-band">
        <span className="cue-title">
          עריכת כרטיס {n}/{total}
        </span>
      </div>
      <div className="cue-body">
        <div className="cue-edit-row">
          <label className="cue-field cue-field-time">
            <span>שעה</span>
            <input id={`cue-time-${card.id}`} type="text" value={form.time_label} onChange={set('time_label')} />
          </label>
          <label className="cue-field cue-field-title">
            <span>כותרת</span>
            <input id={`cue-title-${card.id}`} type="text" value={form.title} onChange={set('title')} />
          </label>
          <label className="cue-field cue-field-who">
            <span>מי מדבר</span>
            <input id={`cue-who-${card.id}`} type="text" value={form.who} onChange={set('who')} />
          </label>
        </div>
        {EDIT_FIELDS.map((f) => (
          <label key={f.key} className="cue-field">
            <span>{f.label}</span>
            <textarea id={`cue-${f.key}-${card.id}`} rows={f.rows} value={form[f.key]} onChange={set(f.key)} />
          </label>
        ))}
        <p className="cue-hint">
          <b>**טקסט**</b> להדגשה · שורה שמתחילה ב-״- ״ הופכת לנקודה · ___ מסמן שדה להשלמה · שדה ריק לא מוצג בכרטיס
        </p>
        <div className="cue-edit-actions">
          <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
            {saving ? 'שומר…' : 'שמירה'}
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>
            ביטול
          </button>
          <span className="spacer" />
          {confirmDelete ? (
            <>
              <span className="cue-confirm">למחוק את הכרטיס?</span>
              <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
                כן, למחוק
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>
                לא
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(true)}>
              מחיקה
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
