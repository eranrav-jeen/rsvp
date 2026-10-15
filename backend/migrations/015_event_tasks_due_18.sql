-- Event-week tasks that were due 16.10 move to 18.10 (requested by the team).
UPDATE tasks
   SET due_date = DATE '2026-10-18', updated_at = now()
 WHERE due_date = DATE '2026-10-16'
   AND title IN (
     'החלטה: סרטון לכנס, כן או לא',
     'החלטה: הגרלה, כן או לא',
     'סקר משוב בסוף האירוע',
     'מפא״ת: לסגור בכתב מה מותר לצלם ולהקליט',
     'שליחת השאלות מראש לחברי הפאנל',
     'שליחת תזכורת למאושרים ו-last call'
   );
