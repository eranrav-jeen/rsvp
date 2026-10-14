import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { CueCardView } from '../components/CueCard.jsx';

// Public, read-only cue cards for one deck (shared via a signed link with the
// MC / panel host). Re-fetches every minute so last-minute edits show up.

const TITLES = { mc: 'כרטיסיות הנחיה · מנחה האירוע', panel: 'כרטיסיות הנחיה · הנחיית הפאנל' };

export default function CueShare() {
  const { deck, token } = useParams();
  const [cards, setCards] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get(`/api/cue-share/${encodeURIComponent(deck)}/${encodeURIComponent(token)}`)
        .then((d) => alive && setCards(d.cards))
        .catch(() => alive && setError(true));
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [deck, token]);

  useEffect(() => {
    document.title = TITLES[deck] || 'כרטיסיות הנחיה';
  }, [deck]);

  return (
    <div className="cue-page cue-public">
      <h1>{TITLES[deck] || 'כרטיסיות הנחיה'}</h1>
      <p className="muted cue-intro">ככה עושים AI בממשלה · יום שלישי, 20.10.2026 · הדף מתעדכן אוטומטית.</p>
      <div className="cue-toolbar">
        <span className="spacer" />
        <button className="btn btn-sm btn-primary" onClick={() => window.print()}>
          הדפסה
        </button>
      </div>
      {error && <p className="form-error">הקישור אינו תקין. בקשו קישור חדש מצוות Jeen.ai.</p>}
      {!cards && !error && <p className="muted">טוען…</p>}
      <div className="cue-deck">
        {(cards || []).map((c, i) => (
          <CueCardView key={c.id} card={c} n={i + 1} total={cards.length} />
        ))}
      </div>
    </div>
  );
}
