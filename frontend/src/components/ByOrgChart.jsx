// Per-organization potential vs confirmed, as a stacked horizontal bar
// (confirmed = coral, remaining potential = light coral). Sorted by potential
// desc, scrollable, with per-row value labels and a legend.
export default function ByOrgChart({ orgs }) {
  if (!orgs || orgs.length === 0) {
    return <p className="muted">אין עדיין נתונים להצגה.</p>;
  }
  const max = Math.max(...orgs.map((o) => o.total), 1);
  const totalPotential = orgs.reduce((a, o) => a + o.total, 0);
  const totalConfirmed = orgs.reduce((a, o) => a + o.confirmed, 0);

  return (
    <div className="byorg">
      <div className="byorg-legend">
        <span>
          <i className="sw sw-confirmed" /> אושרו ({totalConfirmed})
        </span>
        <span>
          <i className="sw sw-potential" /> פוטנציאל ({totalPotential})
        </span>
      </div>
      <div className="byorg-rows">
        {orgs.map((o) => {
          const confirmedPct = (o.confirmed / max) * 100;
          const remainderPct = ((o.total - o.confirmed) / max) * 100;
          return (
            <div
              className="byorg-row"
              key={o.organization}
              title={`${o.organization}: אושרו ${o.confirmed} מתוך ${o.total}`}
            >
              <div className="byorg-name" title={o.organization}>
                {o.organization}
              </div>
              <div className="byorg-track">
                {o.confirmed > 0 && (
                  <div className="byorg-bar confirmed" style={{ width: `${confirmedPct}%` }} />
                )}
                {o.total - o.confirmed > 0 && (
                  <div className="byorg-bar remainder" style={{ width: `${remainderPct}%` }} />
                )}
              </div>
              <div className="byorg-val">
                <b>{o.confirmed}</b> / {o.total}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
