import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Login({ onLoggedIn }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/api/auth/login', { password });
      onLoggedIn && onLoggedIn();
      navigate('/admin/invitees', { replace: true });
    } catch {
      setError('סיסמה שגויה. נסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand" style={{ color: 'var(--color-coral)', fontWeight: 800 }}>
          JEEN.AI
        </div>
        <h1>אזור ניהול</h1>
        <div className="sub">כנס "ככה עושים AI בממשלה"</div>
        <form onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <input
              type="password"
              placeholder="סיסמת מנהל"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'מתחבר…' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  );
}
