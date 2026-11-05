import { useEffect, useState } from 'react';
import { Icon } from './Icon';

// The SLA countdown starts at 13d 04:12:00 when the app first loads and keeps
// ticking across route changes (module-level anchor, not component state).
const SLA_START_SECONDS = 13 * 86400 + 4 * 3600 + 12 * 60;
const loadedAt = Date.now();

function useSlaRemaining() {
  const calc = () => Math.max(0, SLA_START_SECONDS - Math.floor((Date.now() - loadedAt) / 1000));
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const id = window.setInterval(() => setLeft(calc()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return left;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function TopBar({ status }: { status: string }) {
  const left = useSlaRemaining();
  const days = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;

  return (
    <header className="topbar">
      <div className="logo">
        <span className="logo-mark"><Icon name="star" size={18} style={{ color: '#fff' }} /></span>
        <span dir="ltr">Jeen.ai Case Assistant</span>
      </div>
      <span className="tb-divider" aria-hidden="true" />
      <div className="tb-field">
        <span className="tb-label">מספר תיק</span>
        <span className="tb-value mono" dir="ltr">IL-SP-2026-048213</span>
      </div>
      <div className="tb-field">
        <span className="tb-label">בני הזוג</span>
        <span className="tb-value">
          דניאל לוי (אזרח ישראלי) · <span dir="ltr">Maria Santos</span> (דרכון ברזילאי)
        </span>
      </div>
      <div className="tb-field">
        <span className="tb-label">סטטוס</span>
        <span className="tb-status" aria-live="polite">{status}</span>
      </div>
      <div className="tb-end">
        <span className="sla" role="timer" aria-label={`SLA: נותרו ${days} ימים ${h} שעות ו-${m} דקות`}>
          <Icon name="clock" size={15} />
          <span aria-hidden="true">
            SLA · נותרו {days} ימים <span className="mono" dir="ltr">{pad(h)}:{pad(m)}:{pad(s)}</span>
          </span>
        </span>
        <div className="user">
          <span className="avatar" aria-hidden="true">רכ</span>
          <span>רונית כהן<small>רכזת תיקים</small></span>
        </div>
      </div>
    </header>
  );
}
