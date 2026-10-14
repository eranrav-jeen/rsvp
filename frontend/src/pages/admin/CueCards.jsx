import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { CueCardView as CardView } from '../../components/CueCard.jsx';

// Stage cue cards for the event MC and the panel host. Every card is editable
// in place and saved to the server, so the whole team sees the same version.
// Printing (the "הדפסה" button) gives one A5-landscape card per page.

const DECKS = [
  { key: 'mc', label: 'מנחה האירוע' },
  { key: 'panel', label: 'הנחיית הפאנל' },
];

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
  const [shareTokens, setShareTokens] = useState(null);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2200);
  };

  useEffect(() => {
    api
      .get('/api/cue-cards')
      .then((d) => setCards(d.cards))
      .catch(() => setError('לא הצלחנו לטעון את הכרטיסיות.'));
    api
      .get('/api/cue-cards/share')
      .then((d) => setShareTokens(d.tokens))
      .catch(() => {});
  }, []);

  const deckLabel = DECKS.find((d) => d.key === deck)?.label || '';
  const shareUrl = shareTokens?.[deck] ? `${window.location.origin}/cue/${deck}/${shareTokens[deck]}` : '';

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('הקישור הועתק ללוח');
    } catch {
      showToast('לא ניתן להעתיק — סמנו והעתיקו ידנית');
    }
  }

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

      {shareUrl && (
        <div className="share-bar cue-share">
          <div className="share-label">קישור לשיתוף ״{deckLabel}״ (צפייה בלבד, ללא התחברות):</div>
          <input
            className="share-url"
            type="text"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
          />
          <button className="btn btn-sm btn-primary" onClick={copyShare}>
            העתקת קישור
          </button>
          <a className="btn btn-sm btn-ghost" href={shareUrl} target="_blank" rel="noreferrer">
            פתיחה
          </a>
        </div>
      )}

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
