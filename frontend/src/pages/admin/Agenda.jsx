import { useState } from 'react';
import AgendaView from '../../components/AgendaView.jsx';

// Admin view: a preview of the public agenda plus a control to copy its
// shareable URL.
export default function AdminAgenda() {
  const shareUrl = `${window.location.origin}/agenda`;
  const [toast, setToast] = useState('');

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2400);
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('הקישור הועתק ללוח');
    } catch {
      showToast('לא ניתן להעתיק — סמנו והעתיקו ידנית');
    }
  }

  return (
    <div>
      <h1>סדר יום</h1>

      <div className="share-bar">
        <div className="share-label">קישור לשיתוף סדר היום:</div>
        <input className="share-url" type="text" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
        <button className="btn btn-sm btn-primary" onClick={copy}>
          העתקת קישור
        </button>
        <a className="btn btn-sm btn-ghost" href="/agenda" target="_blank" rel="noreferrer">
          פתיחה
        </a>
      </div>
      <p className="muted" style={{ margin: '0 2px 18px', fontSize: 13 }}>
        הקישור נגיש לכל מי שמקבל אותו, ללא צורך בהתחברות.
      </p>

      <div className="agenda-preview">
        <AgendaView />
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
