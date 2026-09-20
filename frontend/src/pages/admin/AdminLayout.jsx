import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import JeenLogo from '../../components/JeenLogo.jsx';

export default function AdminLayout({ onLogout }) {
  const navigate = useNavigate();

  async function logout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* ignore */
    }
    onLogout && onLogout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <span className="app-name on-dark">
          <JeenLogo height={26} showWordmark={false} />
          <span className="an-rsvp">RSVP</span>
          <span className="an-jeen">Jeen.AI</span>
        </span>
        <nav className="admin-nav">
          <NavLink to="/admin/invitees" className={({ isActive }) => (isActive ? 'active' : '')}>
            ניהול הזמנות
          </NavLink>
          <NavLink to="/admin/tasks" className={({ isActive }) => (isActive ? 'active' : '')}>
            משימות
          </NavLink>
          <NavLink to="/admin/registration" className={({ isActive }) => (isActive ? 'active' : '')}>
            טופס הרשמה
          </NavLink>
          <NavLink to="/admin/agenda" className={({ isActive }) => (isActive ? 'active' : '')}>
            סדר יום
          </NavLink>
          <NavLink to="/admin/marketing" className={({ isActive }) => (isActive ? 'active' : '')}>
            חומרי שיווק
          </NavLink>
        </nav>
        <span className="spacer" />
        <button className="btn btn-sm btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }} onClick={logout}>
          יציאה
        </button>
      </div>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
