import { AiTag } from './AiTag';
import { HumanTag } from './HumanTag';

export function Legend() {
  return (
    <section className="card legend" aria-labelledby="legend-h">
      <h2 id="legend-h">מקרא</h2>
      <ul>
        <li><AiTag /> <span>טיוטה – ממתינה להחלטה</span></li>
        <li><HumanTag text="הוכרע ע״י רכזת" /> <span>החלטה אנושית</span></li>
      </ul>
    </section>
  );
}
