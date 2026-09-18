import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { api } from './api.js';
import RsvpForm from './pages/RsvpForm.jsx';
import Agenda from './pages/Agenda.jsx';
import Login from './pages/Login.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Invitees from './pages/admin/Invitees.jsx';
import Tasks from './pages/admin/Tasks.jsx';
import Marketing from './pages/admin/Marketing.jsx';
import AdminAgenda from './pages/admin/Agenda.jsx';

function useAuth() {
  const [state, setState] = useState({ loading: true, isAdmin: false });
  const refresh = async () => {
    try {
      const me = await api.get('/api/auth/me');
      setState({ loading: false, isAdmin: !!me.isAdmin });
    } catch {
      setState({ loading: false, isAdmin: false });
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  return { ...state, refresh, setAdmin: (v) => setState((s) => ({ ...s, isAdmin: v })) };
}

export default function App() {
  const auth = useAuth();
  const location = useLocation();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/rsvp" replace />} />
      <Route path="/rsvp" element={<RsvpForm />} />
      <Route path="/agenda" element={<Agenda />} />

      {/* Admin login */}
      <Route
        path="/admin/login"
        element={
          auth.isAdmin ? (
            <Navigate to="/admin/invitees" replace />
          ) : (
            <Login onLoggedIn={() => auth.setAdmin(true)} />
          )
        }
      />

      {/* Admin area */}
      <Route
        path="/admin"
        element={<RequireAdmin auth={auth} location={location} />}
      >
        <Route index element={<Navigate to="/admin/invitees" replace />} />
        <Route path="invitees" element={<Invitees />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="agenda" element={<AdminAgenda />} />
        <Route path="marketing" element={<Marketing />} />
      </Route>

      <Route path="*" element={<Navigate to="/rsvp" replace />} />
    </Routes>
  );
}

function RequireAdmin({ auth }) {
  if (auth.loading) return <div className="loading">טוען…</div>;
  if (!auth.isAdmin) return <Navigate to="/admin/login" replace />;
  return <AdminLayout onLogout={() => auth.setAdmin(false)} />;
}
