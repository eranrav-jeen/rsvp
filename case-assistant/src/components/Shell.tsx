import type { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { Stepper, type Screen } from './Stepper';
import { TimeSavedWidget } from './TimeSavedWidget';
import { Legend } from './Legend';
import { DECISION_LABEL, useDemo } from '../store';

const STATUS: Record<Exclude<Screen, 'decision'>, string> = {
  intake: 'בטיפול · אימות מסמכים',
  file: 'תיק פתוח · ממתין לראיון',
  interview: 'ראיון בתהליך',
};

export function Shell({ screen, children }: { screen: Screen; children: ReactNode }) {
  const { state, dispatch } = useDemo();
  const { signed, choice } = state.decision;
  const status =
    screen !== 'decision' ? STATUS[screen]
    : signed && choice ? `הוכרע · ${DECISION_LABEL[choice]}`
    : 'ממתין להכרעה';

  return (
    <div className="app">
      <TopBar status={status} />
      <div className="body">
        <aside className="sidebar">
          <Stepper screen={screen} signed={signed} />
          <TimeSavedWidget screen={screen} signed={signed} />
          {screen === 'intake' && <Legend />}
          <div className="side-foot">
            <button type="button" className="link" onClick={() => { dispatch({ type: 'reset' }); window.scrollTo(0, 0); }}>
              Reset demo
            </button>
          </div>
        </aside>
        <main className="main" id="main">{children}</main>
      </div>
    </div>
  );
}
