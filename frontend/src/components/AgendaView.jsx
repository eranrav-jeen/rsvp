import JeenLogo from './JeenLogo.jsx';

// Shared, presentational agenda used by both the public /agenda page and the
// admin preview. Content mirrors the event brief up to (and excluding) the
// closing raffle ("הגרלה") item. Internal planning markers from the brief
// (unconfirmed speaker flag, panel candidate shortlist) are intentionally left
// out because this view is shareable publicly.

export const EVENT = {
  brand: 'JEEN.AI',
  title: 'ככה עושים AI בממשלה',
  subtitle: 'מיטאפ קהילת הממשלה',
  dateLabel: 'יום שלישי, 20.10.2026 · 09:00–13:00',
  place: 'משרדי Jeen.AI · בגין 121, מגדלי עזריאלי שרונה, קומה 34, תל אביב',
};

export const SCHEDULE = [
  {
    time: '09:00',
    dur: '60 דק׳',
    title: 'התכנסות, נטוורקינג וכיבוד',
    desc: 'שעה מלאה לפני התוכן — הזדמנות למפגשים אישיים',
    kind: 'pause',
  },
  {
    time: '10:00',
    dur: '15 דק׳',
    title: 'פתיחה — עודד טהורי',
    desc: 'הצגה כללית של Jeen והפעילות שלנו',
  },
  {
    time: '10:15',
    dur: '35 דק׳',
    title: 'שלוש השאלות שכל ארגון צריך לשאול את עצמו — מוטי קריספיל',
    desc: 'המסגרת התיאורטית, ומשם העמקה במוצר, ביכולות ובערך של Jeen',
    kind: 'anchor',
  },
  {
    time: '10:50',
    dur: '35 דק׳',
    title: 'הרצאות ושיחות לקוח',
    desc: 'קובי כץ — שירותי בריאות מכבי · ערן דהן — מפא״ת',
    kind: 'anchor',
  },
  {
    time: '11:25',
    dur: '15 דק׳',
    title: 'הפסקה קצרה',
    kind: 'pause',
  },
  {
    time: '11:40',
    dur: '20 דק׳',
    title: 'סיפור הצלחה ממשרד ממשלתי',
  },
  {
    time: '12:00',
    dur: '40 דק׳ · פאנל',
    title: 'מ־AI ניסיוני לארגון מבוסס AI: המגזר הציבורי במבט ל־2027',
    desc: 'איך עוברים מפיילוטים נקודתיים להטמעה ארגונית רחבה, מאובטחת ומדידה של AI וסוכנים חכמים · בהובלת ערן רביב',
    kind: 'anchor',
  },
  {
    time: '12:40',
    dur: '10 דק׳',
    title: 'סיכום — עודד טהורי',
  },
];

export default function AgendaView() {
  return (
    <>
      <div className="agenda-hero">
        <div className="hero-logo">
          <JeenLogo height={32} wordmarkColor="var(--color-cream)" />
        </div>
        <h1>{EVENT.title}</h1>
        <div className="agenda-sub">{EVENT.subtitle}</div>
        <div className="meta">{EVENT.dateLabel}</div>
        <div className="meta">{EVENT.place}</div>
      </div>
      <div className="agenda-body">
        <ol className="agenda-list">
          {SCHEDULE.map((item, i) => (
            <li className={`agenda-item ${item.kind || ''}`} key={i}>
              <div className="agenda-time">
                <span className="ag-time">{item.time}</span>
                <span className="ag-dur">{item.dur}</span>
              </div>
              <div className="agenda-detail">
                <div className="ag-title">{item.title}</div>
                {item.desc && <div className="ag-desc">{item.desc}</div>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
