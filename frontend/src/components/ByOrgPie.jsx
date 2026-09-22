import { useState } from 'react';

// Validated categorical hues (from the dataviz skill, fixed order). Top orgs
// take these in order; everything past 8 folds into a neutral "אחר" slice.
const HUES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const OTHER = '#9a8f96';

function arcPath(cx, cy, rO, rI, start, end) {
  const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = pt(rO, start);
  const [x2, y2] = pt(rO, end);
  const [x3, y3] = pt(rI, end);
  const [x4, y4] = pt(rI, start);
  return `M ${x1} ${y1} A ${rO} ${rO} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rI} ${rI} 0 ${large} 0 ${x4} ${y4} Z`;
}

// Pie/donut of invitees per organization. Hover a slice (or legend row) to see
// that organization's counts.
export default function ByOrgPie({ orgs }) {
  const [hover, setHover] = useState(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  if (!orgs || orgs.length === 0) {
    return <p className="muted">אין עדיין נתונים להצגה.</p>;
  }

  const sorted = [...orgs].sort((a, b) => b.total - a.total);
  const TOP = 8;
  const slices = sorted.slice(0, TOP).map((o, i) => ({
    label: o.organization,
    total: o.total,
    confirmed: o.confirmed,
    color: HUES[i],
  }));
  const rest = sorted.slice(TOP);
  if (rest.length) {
    slices.push({
      label: `אחר (${rest.length} ארגונים)`,
      total: rest.reduce((a, o) => a + o.total, 0),
      confirmed: rest.reduce((a, o) => a + o.confirmed, 0),
      color: OTHER,
    });
  }

  const sum = slices.reduce((a, s) => a + s.total, 0) || 1;
  const cx = 110;
  const cy = 110;
  const rO = 100;
  const rI = 60;
  let angle = -Math.PI / 2;
  const arcs = slices.map((s) => {
    const frac = s.total / sum;
    const start = angle;
    let end = angle + frac * 2 * Math.PI;
    angle = end;
    if (end - start >= 2 * Math.PI) end = start + 2 * Math.PI - 0.0001; // single-slice guard
    return { ...s, d: arcPath(cx, cy, rO, rI, start, end) };
  });

  return (
    <div
      className="pie-wrap"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
    >
      <svg viewBox="0 0 220 220" className="pie-svg" role="img" aria-label="התפלגות מוזמנים לפי ארגון">
        {arcs.map((a, i) => (
          <path
            key={i}
            d={a.d}
            fill={a.color}
            stroke="#fff"
            strokeWidth="2"
            opacity={hover == null || hover === i ? 1 : 0.35}
            style={{ cursor: 'pointer', transition: 'opacity .12s' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <text x={cx} y={cy - 2} textAnchor="middle" className="pie-center-num">
          {sum}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="pie-center-lbl">
          מוזמנים
        </text>
      </svg>

      <div className="pie-legend">
        {arcs.map((a, i) => (
          <div
            key={i}
            className={`pie-leg-item ${hover === i ? 'active' : ''}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <i style={{ background: a.color }} />
            <span className="pie-leg-name" title={a.label}>
              {a.label}
            </span>
            <span className="pie-leg-val">{a.total}</span>
          </div>
        ))}
      </div>

      {hover != null && (
        <div className="pie-tip" style={{ left: pos.x + 14, top: pos.y + 14 }}>
          <b>{arcs[hover].label}</b>
          <div>
            {arcs[hover].total} מוזמנים · {arcs[hover].confirmed} אושרו
          </div>
        </div>
      )}
    </div>
  );
}
