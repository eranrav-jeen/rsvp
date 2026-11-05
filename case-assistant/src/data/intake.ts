import type { Status } from '../components/StatusIcon';

export interface CheckRow {
  title: string;
  status: Status;
  conf: number;
  text: string;
  link?: { doc: string; field: string; label: string };
}

export const CHECKS: CheckRow[] = [
  {
    title: 'זיהוי המבקשים', status: 'ok', conf: 98,
    text: 'דניאל לוי אומת מול מרשם האוכלוסין. Maria Santos אותרה כתושבת זרה (אשרת B/2 בתוקף עד 01.12.2026). בנה הקטין Lucas Santos (15) קושר לתיק.',
    link: { doc: 'passport', field: 'name', label: 'שם בדרכון' },
  },
  {
    title: 'בדיקת רקע למוזמן', status: 'ok', conf: 94,
    text: '3 כניסות ויציאות מאז 2022, כל השהיות במסגרת האשרה. אין שהייה בלתי חוקית, אין הרחקות ואין בקשות קודמות.',
  },
  {
    title: 'בדיקת רקע לישראלי', status: 'ok', conf: 97,
    text: 'התיק האישי תקין. נמצאה בקשה קודמת אחת לבת זוג זרה (2017), שנסגרה בעקבות פרידה. לא מהווה מניעה. מוצג לידיעתך.',
  },
  {
    title: 'בדיקת דרכון המוזמן', status: 'ok', conf: 99,
    text: 'דרכון ברזילאי FX482913 בתוקף עד 22.09.2031 – כ-4 שנים ו-10 חודשים, מעל הסף הנדרש של שנתיים.',
    link: { doc: 'passport', field: 'expiry', label: 'תוקף הדרכון' },
  },
  {
    title: 'בחינת מצב אישי', status: 'warn', conf: 71,
    text: 'כל המסמכים הוגשו עם אפוסטיל ותרגום נוטריוני. תעודת לידה מעודכנת (03/2026) מעידה על רווקות בשנה שלפני הנישואין. נמצאה אי-התאמה בתאריך הלידה בתעודת הנישואין.',
    link: { doc: 'marriage', field: 'dob', label: 'תאריך לידה בתעודת הנישואין' },
  },
  {
    title: 'היעדר מניעה פלילית וביטחונית', status: 'miss', conf: 96,
    text: 'תעודת היושר של המוזמנת תקינה (ברזיל, 08/2026, אין רישום). חסרה תעודת יושר עבור Lucas Santos (15), הנדרשת לכל ילד מעל גיל 14.',
    link: { doc: 'criminal', field: 'result', label: 'תעודת יושר' },
  },
  {
    title: 'ראיות ראשוניות למרכז חיים וכנות הקשר', status: 'warn', conf: 82,
    text: 'חוזה שכירות משותף מ-04/2024, חשבון בנק משותף פעיל, 46 תמונות (2022–2026) והתכתבויות רציפות. פער: הכתובת בחוזה (רמת גן) שונה מהכתובת במרשם (תל אביב).',
    link: { doc: 'lease', field: 'address', label: 'כתובת בחוזה' },
  },
];

export interface DocField { key?: string; label: string; value: string }
export interface Doc {
  id: string;
  tab: string;
  origin: string;
  title: string;
  ocr: number;
  photo?: boolean;
  mrz?: string;
  stamp?: string;
  gallery?: string[];
  fields: DocField[];
  footer: string;
  flagged?: boolean;
}

export const DOCS: Doc[] = [
  {
    id: 'passport', tab: 'דרכון', origin: 'REPÚBLICA FEDERATIVA DO BRASIL · PASSAPORTE',
    title: 'דרכון – Maria Clara Santos', ocr: 99, photo: true,
    mrz: 'P<BRASANTOS<<MARIA<CLARA<<<<<<<<<<<<<<<<<<<\nFX482913<4BRA9403146F3109221<<<<<<<<<<<<<<06',
    fields: [
      { key: 'name', label: 'Sobrenome, Nome / שם', value: 'SANTOS, MARIA CLARA' },
      { key: 'no', label: 'Passaporte nº / מס׳ דרכון', value: 'FX482913' },
      { key: 'nat', label: 'Nacionalidade / אזרחות', value: 'BRASILEIRA' },
      { key: 'dob', label: 'Data de nascimento / תאריך לידה', value: '14 MAR 1994' },
      { key: 'pob', label: 'Local de nascimento / מקום לידה', value: 'SÃO PAULO / SP' },
      { key: 'issue', label: 'Data de expedição / הנפקה', value: '23 SET 2021' },
      { key: 'expiry', label: 'Válido até / בתוקף עד', value: '22 SET 2031' },
      { key: 'sex', label: 'Sexo / מין', value: 'F' },
    ],
    footer: 'סריקה מקורית · עמוד ביומטרי · אזור MRZ אומת (ספרות ביקורת תקינות)',
  },
  {
    id: 'birth', tab: 'תעודת לידה', origin: 'REPÚBLICA FEDERATIVA DO BRASIL · CERTIDÃO DE NASCIMENTO',
    title: 'תעודת לידה – Maria Clara Santos', ocr: 97,
    stamp: 'אפוסטיל ברזיל · 04.04.2026 · תרגום נוטריוני לעברית מצורף',
    fields: [
      { key: 'name', label: 'Nome / שם', value: 'MARIA CLARA SANTOS' },
      { key: 'dob', label: 'Data de nascimento / תאריך לידה', value: '14/03/1994' },
      { key: 'pob', label: 'Local / מקום', value: 'São Paulo – SP' },
      { key: 'par', label: 'Filiação / הורים', value: 'José C. Santos · Ana P. R. Santos' },
      { key: 'civil', label: 'Estado civil / מצב אישי', value: 'Solteira (רווקה) · נכון ל-03/2026' },
      { key: 'reg', label: 'Cartório / לשכת רישום', value: '1º Subdistrito – Sé' },
    ],
    footer: 'עותק מעודכן שהונפק 03/2026 · משמש גם כאישור רווקות',
  },
  {
    id: 'marriage', tab: 'תעודת נישואין', origin: 'REPUBLIC OF CYPRUS · MARRIAGE CERTIFICATE',
    title: 'תעודת נישואין – לרנקה, קפריסין', ocr: 96, flagged: true,
    stamp: 'אפוסטיל קפריסין A-CY 118204 · 25.06.2024',
    fields: [
      { key: 'groom', label: 'Groom / החתן', value: 'DANIEL LEVI' },
      { key: 'gdob', label: 'Date of birth / ת. לידה', value: '02.07.1991' },
      { key: 'bride', label: 'Bride / הכלה', value: 'MARIA CLARA SANTOS' },
      { key: 'dob', label: 'Date of birth / ת. לידה', value: '14.08.1994' },
      { key: 'date', label: 'Date of marriage / תאריך נישואין', value: '18.06.2024' },
      { key: 'reg', label: 'Registration no. / מס׳ רישום', value: '2024/LCA/03317' },
    ],
    footer: 'נרשם ע״י Marriage Officer, Larnaca Municipality · תרגום נוטריוני מצורף',
  },
  {
    id: 'apostille', tab: 'אפוסטיל', origin: 'APOSTILLE · CONVENTION DE LA HAYE DU 5 OCTOBRE 1961',
    title: 'אישור אפוסטיל – תעודת נישואין', ocr: 98,
    stamp: 'מקושר אוטומטית ל: תעודת נישואין 2024/LCA/03317',
    fields: [
      { key: 'country', label: 'Country / מדינה', value: 'Republic of Cyprus' },
      { key: 'signed', label: 'Signed by / נחתם ע״י', value: 'Marriage Officer, Larnaca' },
      { key: 'at', label: 'Certified at / אושר ב', value: 'Nicosia' },
      { key: 'date', label: 'Date / תאריך', value: '25.06.2024' },
      { key: 'number', label: 'Number / מספר', value: 'A-CY 118204' },
      { key: 'auth', label: 'Authority / רשות', value: 'Ministry of Interior' },
    ],
    footer: 'מספר האפוסטיל אומת מול מאגר הרשות המנפיקה',
  },
  {
    id: 'criminal', tab: 'תעודת יושר', origin: 'POLÍCIA FEDERAL · CERTIDÃO DE ANTECEDENTES CRIMINAIS',
    title: 'תעודת יושר – Maria Clara Santos', ocr: 98,
    stamp: 'אפוסטיל ברזיל · 12.08.2026',
    fields: [
      { key: 'name', label: 'Nome / שם', value: 'MARIA CLARA SANTOS' },
      { key: 'id', label: 'Documento / מסמך זיהוי', value: 'Passaporte FX482913' },
      { key: 'result', label: 'Resultado / תוצאה', value: 'NADA CONSTA – אין רישום' },
      { key: 'issued', label: 'Emitida em / הונפקה', value: '08/08/2026' },
      { key: 'valid', label: 'Validade / תוקף', value: '90 dias' },
      { key: 'code', label: 'Código de validação', value: 'PF-26-0918-4471' },
    ],
    footer: 'לא הוגשה תעודת יושר עבור Lucas Santos (15)',
  },
  {
    id: 'bank', tab: 'דף חשבון בנק', origin: 'בנק לדוגמה בע״מ · סניף רמת גן',
    title: 'דף חשבון משותף · 08–10/2026', ocr: 99,
    fields: [
      { key: 'owners', label: 'בעלי החשבון', value: 'דניאל לוי, Maria Clara Santos' },
      { key: 'opened', label: 'נפתח', value: '03/2024' },
      { key: 'address', label: 'כתובת למשלוח', value: 'רח׳ ביאליק 41, רמת גן' },
      { key: 'shared', label: 'תנועות משותפות', value: 'שכר דירה, מזון, חשמל, ביטוח' },
      { key: 'salary', label: 'הפקדות שכר', value: 'שני בני הזוג' },
      { key: 'balance', label: 'יתרה ממוצעת', value: '[מושחר]' },
    ],
    footer: 'ה-AI סיווג 214 תנועות · 71% הוצאות משק בית משותף',
  },
  {
    id: 'lease', tab: 'חוזה שכירות', origin: 'הסכם שכירות בלתי מוגנת',
    title: 'חוזה שכירות משותף', ocr: 97,
    fields: [
      { key: 'tenants', label: 'השוכרים', value: 'דניאל לוי ו-Maria Clara Santos' },
      { key: 'address', label: 'כתובת הנכס', value: 'רח׳ ביאליק 41, דירה 7, רמת גן' },
      { key: 'period', label: 'תקופה', value: '01.04.2024 – 31.03.2027' },
      { key: 'rent', label: 'דמי שכירות', value: '6,200 ₪ לחודש' },
      { key: 'signed', label: 'נחתם', value: '14.03.2024' },
      { key: 'landlord', label: 'המשכיר', value: 'א. ר. (אדם פרטי)' },
    ],
    footer: 'הכתובת אינה תואמת לכתובת דניאל במרשם האוכלוסין (תל אביב)',
  },
  {
    id: 'photos', tab: 'תמונות', origin: 'קובצי תמונה · 46 פריטים',
    title: 'תמונות משותפות', ocr: 100,
    gallery: ['תל אביב · 11/2022', 'ליסבון · 02/2023', 'אילת · 08/2023', 'לרנקה · 06/2024', 'רמת גן · 12/2024', 'ירושלים · 04/2026'],
    fields: [
      { key: 'count', label: 'כמות', value: '46 תמונות' },
      { key: 'range', label: 'טווח תאריכים (EXIF)', value: '11/2022 – 09/2026' },
      { key: 'both', label: 'שני בני הזוג מופיעים', value: '41 תמונות' },
      { key: 'places', label: 'מיקומים עיקריים', value: 'תל אביב, רמת גן, ליסבון' },
    ],
    footer: 'מטא-דאטה חולצה אוטומטית · לא בוצעה הסקה על כנות הקשר',
  },
  {
    id: 'chat', tab: 'התכתבויות', origin: 'ייצוא WhatsApp · PDF',
    title: 'התכתבויות בין בני הזוג', ocr: 95,
    fields: [
      { key: 'range', label: 'טווח', value: '09/2022 – 10/2026' },
      { key: 'count', label: 'הודעות', value: 'כ-12,400' },
      { key: 'langs', label: 'שפות', value: 'אנגלית, פורטוגזית, עברית' },
      { key: 'gaps', label: 'פערים מעל 14 יום', value: 'לא נמצאו' },
    ],
    footer: 'ההודעה הראשונה: 03.09.2022 · מוצג תקציר בלבד, לא תוכן ההודעות',
  },
];

export interface XField {
  label: string;
  value: string;
  conf: number;
  sources: { name: string; value: string; bad?: boolean }[];
  status: string;
  tone: 'ok' | 'warn';
}

export const XFIELDS: XField[] = [
  {
    label: 'שם מלא', value: 'Maria Clara Santos', conf: 98,
    sources: [
      { name: 'דרכון', value: 'SANTOS, MARIA C.' },
      { name: 'תעודת לידה', value: 'MARIA C. SANTOS' },
      { name: 'תעודת נישואין', value: 'MARIA C. SANTOS' },
    ],
    status: 'תואם ב-4 מסמכים (נורמל סדר שמות)', tone: 'ok',
  },
  {
    label: 'תאריך לידה', value: '14.03.1994', conf: 93,
    sources: [
      { name: 'דרכון', value: '14.03.1994' },
      { name: 'תעודת לידה', value: '14.03.1994' },
      { name: 'תעודת נישואין', value: '14.08.1994', bad: true },
    ],
    status: 'אי-התאמה – ממתין להכרעה', tone: 'warn',
  },
  {
    label: 'מס׳ דרכון', value: 'FX482913', conf: 99,
    sources: [
      { name: 'דרכון (MRZ)', value: 'FX482913' },
      { name: 'טופס מקוון', value: 'FX482913' },
      { name: 'תעודת יושר', value: 'FX482913' },
    ],
    status: 'תואם ב-3 מסמכים', tone: 'ok',
  },
  {
    label: 'תוקף דרכון', value: '22.09.2031', conf: 99,
    sources: [
      { name: 'דרכון', value: '22.09.2031' },
      { name: 'טופס מקוון', value: '22.09.2031' },
    ],
    status: 'בתוקף מעל שנתיים', tone: 'ok',
  },
];

export function buildRequestDraft(includeMarriage: boolean) {
  const items = [
    '1. תעודת יושר עבור Lucas Santos (בן 15), עם אפוסטיל ותרגום נוטריוני לעברית.',
    ...(includeMarriage
      ? ['2. תעודת נישואין מתוקנת, או אישור תיקון מרשם הנישואין בלרנקה: תאריך הלידה של Maria נרשם 14.08.1994 במקום 14.03.1994.']
      : []),
  ];
  return [
    'שלום Maria ודניאל,',
    '',
    'במסגרת הטיפול בבקשתכם (תיק IL-SP-2026-048213) נדרשים המסמכים הבאים:',
    ...items,
    '',
    'אפשר להעלות את המסמכים באזור האישי עד 19.11.2026.',
    '',
    'בברכה,',
    'רונית כהן, רכזת תיקים',
  ].join('\n');
}
