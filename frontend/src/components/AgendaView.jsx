import JeenLogo from './JeenLogo.jsx';

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

export const SCHEDULE = [
  {
    time: '09:00',
    dur: '60 דק׳',
    title: 'התכנסות, נטוורקינג וכיבוד',
    desc: 'שעה של היכרות ומפגשים אישיים לפני שנפתח',
    kind: 'pause',
  },
  {
    time: '10:00',
    dur: '15 דק׳',
    title: 'דברי פתיחה',
    desc: 'עודד טהורי, מנכ״ל Jeen.ai',
  },
  {
    time: '10:15',
    dur: '25 דק׳',
    title: 'שלוש השאלות שכל ארגון צריך לשאול את עצמו על AI',
    desc: 'מוטי קריספיל, Jeen.ai — מסגרת מעשית ליישום AI בסקייל',
    kind: 'anchor',
  },
  {
    time: '10:40',
    dur: '25 דק׳',
    title: 'סיפור לקוח · מכבי שירותי בריאות',
    desc: 'קובי כץ, סמנכ״ל וראש חטיבת טכנולוגיות, מכבי שירותי בריאות',
    kind: 'anchor',
  },
  {
    time: '11:05',
    dur: '25 דק׳',
    title: 'סיפור לקוח · מפא״ת',
    desc: 'ערן דהן, מפא״ת',
    kind: 'anchor',
  },
  {
    time: '11:30',
    dur: '30 דק׳',
    title: 'הפסקה',
    kind: 'pause',
  },
  {
    time: '12:00',
    dur: '45 דק׳ · פאנל',
    title: 'מ-AI ניסיוני לארגון מבוסס AI: המגזר הציבורי במבט ל-2027',
    desc: 'מהפיילוטים להטמעה ארגונית רחבה, מאובטחת ומדידה של AI וסוכנים חכמים · בהנחיית ערן רביב ומתן ניצן, Jeen.ai',
    kind: 'anchor',
    people: [
      { name: 'אלבי מלכה', role: 'סמנכ״ל טכנולוגיות ומערכות מידע, רשות העתיקות' },
      { name: 'ששון סופרי', role: 'מנמ״ר משרד המשפטים' },
      { name: 'שני וייץ', role: 'מנהלת תחום האצה דיגיטלית, מערך הדיגיטל הלאומי' },
      {
        name: 'ניר מקובר',
        role: 'ראש מערך הטכנולוגיות, המידע והחדשנות, חטיבת המרכזים הרפואיים הממשלתיים, משרד הבריאות',
      },
      { name: 'חנה שילדר', role: 'מנהלת מגזר דיגיטל ואנליטיקה, חברת החשמל' },
    ],
  },
  {
    time: '12:45',
    dur: '15 דק׳',
    title: 'דברי סיום ונטוורקינג',
    desc: 'עודד טהורי, מנכ״ל Jeen.ai',
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
