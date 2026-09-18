import AgendaView from '../components/AgendaView.jsx';

// Public, shareable agenda page (no auth) — the URL admins copy and send out.
export default function Agenda() {
  return (
    <div className="agenda-page">
      <div className="agenda-card">
        <AgendaView />
      </div>
    </div>
  );
}
