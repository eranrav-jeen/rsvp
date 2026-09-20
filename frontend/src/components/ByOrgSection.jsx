import { useState } from 'react';
import ByOrgChart from './ByOrgChart.jsx';
import ByOrgPie from './ByOrgPie.jsx';

// Collapsible "צפי הגעה לפי ארגון" section (closed by default) with a
// bar / pie view toggle.
export default function ByOrgSection({ orgs }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('bar');

  return (
    <div className="byorg-section">
      <button className="byorg-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={`chev ${open ? 'open' : ''}`}>▸</span>
        צפי הגעה לפי ארגון
      </button>
      {open && (
        <div className="table-wrap byorg-panel">
          <div className="byorg-viewtoggle">
            <button
              className={`btn btn-sm ${view === 'bar' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setView('bar')}
            >
              עמודות
            </button>
            <button
              className={`btn btn-sm ${view === 'pie' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setView('pie')}
            >
              עוגה
            </button>
          </div>
          {view === 'bar' ? <ByOrgChart orgs={orgs} /> : <ByOrgPie orgs={orgs} />}
        </div>
      )}
    </div>
  );
}
