export type Topic = 'met' | 'routine' | 'family' | 'home';
export type Speaker = 'i' | 'd' | 'm';

export const TOPIC_LABEL: Record<Topic, string> = {
  met: 'איך הכירו', routine: 'שגרה יומית', family: 'היכרות עם המשפחה', home: 'הסדרי מגורים',
};

export interface Message {
  who: Speaker; name: string; av: string; room: string; time: string; he: string; en: string; flag?: number;
}

export const MESSAGES: Message[] = [
  { who: 'i', name: 'מראיינת', av: 'רכ', room: 'חדר א׳', time: '14:02', he: 'ספר לי איך ומתי הכרתם.', en: 'Tell me how and when you met.' },
  { who: 'd', name: 'דניאל', av: 'ד', room: 'חדר א׳', time: '14:02', he: 'הכרנו באוגוסט 2022 בתל אביב, במסיבת יום הולדת של חבר משותף ביפו. היא הייתה בביקור אצל חברה.', en: "We met in August 2022 in Tel Aviv, at a mutual friend's birthday party in Jaffa. She was visiting a friend.", flag: 1 },
  { who: 'i', name: 'מראיינת', av: 'רכ', room: 'חדר ב׳', time: '14:09', he: 'ספרי לי איך ומתי הכרת את דניאל.', en: 'Tell me how and when you met Daniel.' },
  { who: 'm', name: 'Maria', av: 'M', room: 'חדר ב׳', time: '14:10', he: 'הכרנו בתחילת 2023 בליסבון, בחתונה של חבר.', en: "We met at the beginning of 2023, in Lisbon, at a friend's wedding.", flag: 1 },
  { who: 'i', name: 'מראיינת', av: 'רכ', room: 'חדר א׳', time: '14:14', he: 'איפה אתם גרים היום?', en: 'Where do you live today?' },
  { who: 'd', name: 'דניאל', av: 'ד', room: 'חדר א׳', time: '14:14', he: 'ברמת גן, ברחוב ביאליק. עברנו לפני שנתיים מתל אביב. את הכתובת במשרד הפנים עוד לא עדכנו.', en: "In Ramat Gan, on Bialik Street. We moved from Tel Aviv two years ago. We haven't updated the address with the Ministry yet.", flag: 2 },
  { who: 'm', name: 'Maria', av: 'M', room: 'חדר ב׳', time: '14:18', he: 'דניאל יוצא לעבודה בשש, הוא חשמלאי. אני עובדת בערבים במלון בתל אביב.', en: 'Daniel leaves for work at six, he is an electrician. I work evenings at a hotel in Tel Aviv.', flag: 3 },
  { who: 'd', name: 'דניאל', av: 'ד', room: 'חדר א׳', time: '14:21', he: 'מריה עובדת בבקרים בבית קפה בפלורנטין.', en: 'Maria works mornings at a café in Florentin.', flag: 3 },
];

export interface Question { id: string; topic: Topic; to: string; conf: number; he: string; en: string; reason: string }

export const QUESTIONS: Question[] = [
  { id: 'q1', topic: 'met', to: 'Maria', conf: 94, he: 'מתי ביקרת בישראל לראשונה, והאם היית כאן בקיץ 2022?', en: 'When did you first visit Israel, and were you here in summer 2022?', reason: 'בודק את סתירה #1. לפי מעברי הגבול, Maria נכנסה לישראל ב-07/2022.' },
  { id: 'q2', topic: 'met', to: 'דניאל', conf: 88, he: 'מה היה האירוע בליסבון בתחילת 2023, והאם השתתפת בו?', en: 'What was the event in Lisbon in early 2023, and did you attend?', reason: 'Maria הזכירה חתונה בליסבון. בתיק יש תמונה משותפת מליסבון מ-02/2023.' },
  { id: 'q3', topic: 'routine', to: 'שניהם', conf: 91, he: 'איפה עובדת Maria היום, ובאילו שעות?', en: 'Where does Maria work today, and during which hours?', reason: 'סתירה #3. בדף הבנק מופיעות הפקדות שכר ממלון מ-01/2026.' },
  { id: 'q4', topic: 'home', to: 'Maria', conf: 86, he: 'מה שם הרחוב שלכם, ומי המשכיר של הדירה?', en: 'What is your street name, and who is your landlord?', reason: 'מאמת את גרסת דניאל (סתירה #2) מול חוזה השכירות.' },
  { id: 'q5', topic: 'family', to: 'Maria', conf: 82, he: 'מה שמות ההורים של דניאל, ואיפה הם גרים?', en: "What are the names of Daniel's parents, and where do they live?", reason: 'נושא שטרם נבדק עם Maria. כיסוי הנושא: 10%.' },
  { id: 'q6', topic: 'family', to: 'דניאל', conf: 80, he: 'באיזו כיתה Lucas לומד ומה שם בית הספר שלו?', en: 'Which grade is Lucas in, and what is his school called?', reason: 'בודק היכרות של דניאל עם בנה של Maria, שמקושר לתיק.' },
];

export interface Contradiction {
  n: number; sev: 'high' | 'mid'; topic: Topic; kind: string;
  a: { who: string; text: string }; b: { who: string; text: string };
  docs: string; note: string; q: string;
  /** indexes (0-based) of the transcript messages that must be visible before the card shows */
  msgs: number[];
}

export const CONTRADICTIONS: Contradiction[] = [
  {
    n: 1, sev: 'high', topic: 'met', kind: 'בין בני הזוג',
    a: { who: 'דניאל', text: '08/2022 · תל אביב, יום הולדת ביפו' },
    b: { who: 'Maria', text: 'תחילת 2023 · ליסבון, חתונה' },
    docs: 'כניסה לישראל 07/2022 · הודעה ראשונה 09/2022 · תמונה בתל אביב 11/2022. תומך בגרסת דניאל.',
    note: 'ייתכן ש-Maria מתייחסת לתחילת הקשר הזוגי ולא להיכרות הראשונה. מומלץ לברר לפני הסקת מסקנה.',
    q: 'q1', msgs: [1, 3],
  },
  {
    n: 2, sev: 'mid', topic: 'home', kind: 'מול מסמכים',
    a: { who: 'דניאל', text: 'גרים ברמת גן כשנתיים' },
    b: { who: 'מרשם האוכלוסין', text: 'רח׳ שינקין, תל אביב' },
    docs: 'חוזה שכירות ודף בנק: רח׳ ביאליק 41, רמת גן.',
    note: 'ההסבר של דניאל תואם את החוזה. אפשר להנחות לעדכן כתובת במרשם.',
    q: 'q4', msgs: [5],
  },
  {
    n: 3, sev: 'mid', topic: 'routine', kind: 'בין בני הזוג',
    a: { who: 'Maria', text: 'ערבים · מלון בתל אביב' },
    b: { who: 'דניאל', text: 'בקרים · בית קפה בפלורנטין' },
    docs: 'הפקדות שכר ממלון מ-01/2026. עד 12/2025 – מבית קפה.',
    note: 'ייתכן שדניאל מתאר את מקום העבודה הקודם. כדאי לברר מתי התחלפה העבודה.',
    q: 'q3', msgs: [6, 7],
  },
];

export const COVERAGE: { topic: Topic; base: number; boosted: number; q: string }[] = [
  { topic: 'met', base: 80, boosted: 95, q: 'q1' },
  { topic: 'routine', base: 50, boosted: 75, q: 'q3' },
  { topic: 'family', base: 10, boosted: 45, q: 'q5' },
  { topic: 'home', base: 60, boosted: 85, q: 'q4' },
];
