import { Link } from 'react-router-dom';
import { Icon } from './Icon';

export type Screen = 'intake' | 'file' | 'interview' | 'decision';

const STEPS = [
  { n: 1, label: 'קליטת בקשה מקוונת', to: '/intake', done: 'הושלם · AI 0:40 דק׳' },
  { n: 2, label: 'השוואה ואימות מסמכים', to: '/intake', done: 'הושלם · 14 דק׳' },
  { n: 3, label: 'פתיחת תיק ממוחשב', to: '/file', done: 'הושלם · 2 דק׳' },
  { n: 4, label: 'ראיון בני הזוג', to: '/interview', done: 'הושלם · 48 דק׳' },
  { n: 5, label: 'מתן הכרעה', to: '/decision', done: 'הושלם' },
];

const CURRENT: Record<Screen, number> = { intake: 2, file: 3, interview: 4, decision: 5 };

export function Stepper({ screen, signed }: { screen: Screen; signed: boolean }) {
  // After signing, every step is done and nothing is "current".
  const current = screen === 'decision' && signed ? 6 : CURRENT[screen];
  return (
    <nav className="card stepper" aria-labelledby="stepper-h">
      <h2 id="stepper-h">שלבי הטיפול</h2>
      <ol className="steps">
        {STEPS.map((s) => {
          const state = s.n < current ? 'done' : s.n === current ? 'current' : 'todo';
          const caption =
            state === 'done' ? s.done
            : state === 'current' ? 'בטיפול כעת'
            : s.n === 4 && screen === 'file' ? 'היום 14:00'
            : 'ממתין';
          return (
            <li key={s.n}>
              <Link to={s.to} className={`step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                <span className="step-num" aria-hidden="true">
                  {state === 'done' ? <Icon name="check" size={14} /> : s.n}
                </span>
                <span>
                  <span className="step-label">{s.label}</span>
                  <span className="step-cap">{caption}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
