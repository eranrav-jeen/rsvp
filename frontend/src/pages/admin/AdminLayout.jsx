import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';

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
        <span className="logo">RSVP Jeen.AI</span>
        <nav className="admin-nav">
          <NavLink to="/admin/invitees" className={({ isActive }) => (isActive ? 'active' : '')}>
            מוזמנים
          </NavLink>
          <NavLink to="/admin/tasks" className={({ isActive }) => (isActive ? 'active' : '')}>
            משימות
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
