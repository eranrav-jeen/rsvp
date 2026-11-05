import { Icon } from './Icon';
import type { Screen } from './Stepper';

const SO_FAR: Record<Screen, string> = { intake: '0:38', file: '0:52', interview: '1:24', decision: '5:31' };

export function TimeSavedWidget({ screen, signed }: { screen: Screen; signed: boolean }) {
  const soFar = screen === 'decision' && signed ? '5:48' : SO_FAR[screen];
  return (
    <section className="card ts" aria-labelledby="ts-h">
      <h2 id="ts-h"><Icon name="clock" size={16} className="ico-ai" />זמן טיפול משוער</h2>
      <div className="ts-big">
        <s>15 שעות</s>
        <span aria-hidden="true">←</span>
        <span className="to">6 שעות</span>
      </div>
      <div className="ts-bar">
        <span className="lbl">טיפול ידני</span>
        <span className="ts-track"><span style={{ width: '100%', background: 'var(--gray-400)' }} /></span>
        <span className="val">15 ש׳</span>
      </div>
      <div className="ts-bar">
        <span className="lbl">עם Jeen.ai</span>
        <span className="ts-track"><span style={{ width: '40%', background: 'var(--ai-500)' }} /></span>
        <span className="val">6 ש׳</span>
      </div>
      <div className="ts-rows">
        <div><span>חיסכון לתיק</span><b>9 שעות (60%)</b></div>
        <div><span>בתיק זה עד כה</span><b className="mono">{soFar}</b></div>
      </div>
    </section>
  );
}
