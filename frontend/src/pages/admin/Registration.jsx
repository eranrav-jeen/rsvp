import { useState } from 'react';

// Admin view of the public registration form: a shareable URL + a live preview.
export default function AdminRegistration() {
  const shareUrl = `${window.location.origin}/rsvp`;
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
      <h1>טופס הרשמה</h1>

      <div className="share-bar">
        <div className="share-label">קישור לטופס ההרשמה:</div>
        <input
          className="share-url"
          type="text"
          readOnly
          value={shareUrl}
          onFocus={(e) => e.target.select()}
        />
        <button className="btn btn-sm btn-primary" onClick={copy}>
          העתקת קישור
        </button>
        <a className="btn btn-sm btn-ghost" href="/rsvp" target="_blank" rel="noreferrer">
          פתיחה
        </a>
      </div>
      <p className="muted" style={{ margin: '0 2px 18px', fontSize: 13 }}>
        הקישור נגיש לכל מי שמקבל אותו, ללא צורך בהתחברות. כך נראה הטופס למוזמנים:
      </p>

      <div className="form-preview">
        <iframe src="/rsvp" title="תצוגה מקדימה של טופס ההרשמה" loading="lazy" />
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
