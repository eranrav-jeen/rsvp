import JeenLogo from './JeenLogo.jsx';
import agenda from '../agenda.json';

// Shared, presentational agenda used by both the public /agenda page and the
// admin preview. Content mirrors the event brief up to (and excluding) the
// closing raffle ("הגרלה") item. Internal planning markers from the brief
// (unconfirmed speaker flag, panel candidate shortlist) are intentionally left
// out because this view is shareable publicly.

export const EVENT = {
  brand: 'JEEN.AI',
  title: 'ככה עושים AI בממשלה',
  subtitle: 'מיטאפ קהילת המגזר הציבורי',
  dateLabel: 'יום שלישי, 20.10.2026 · 09:00–13:00',
  place: 'משרדי Jeen.ai · בגין 121, מגדלי עזריאלי שרונה, קומה 34, תל אביב',
};

// The schedule lives in ../agenda.json so the backend can embed the same agenda
// in outgoing emails (backend/src/agenda.js reads that file). Edit it there.
export const SCHEDULE = agenda;

export default function AgendaView() {
  return (
    <>
      <div className="agenda-hero">
        <div className="hero-logo">
          <JeenLogo height={32} wordmarkColor="var(--color-cream)" />
        </div>
        <h1>{EVENT.title}</h1>
        <div className="agenda-sub">{EVENT.subtitle}</div>
        <div className="meta meta-date">{EVENT.dateLabel}</div>
        <div className="meta">{EVENT.place}</div>
      </div>
      <div className="agenda-body">
        <ol className="agenda-list">
          {SCHEDULE.map((item, i) => (
            <li className={`agenda-item ${item.kind || ''}`} key={i}>
              <div className="agenda-time">
                <span className="ag-time">{item.time}</span>
              </div>
              <div className="agenda-detail">
                <div className="ag-title">{item.title}</div>
                {item.desc && <div className="ag-desc">{item.desc}</div>}
                {item.hosts && <div className="ag-hosts">{item.hosts}</div>}
                {item.people && (
                  <ul className="ag-people">
                    {item.people.map((p, j) => (
                      <li key={j}>
                        <span className="ag-person-name">{p.name}</span>
                        <span className="ag-person-role">{p.role}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
