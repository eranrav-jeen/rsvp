import { OWNERS, OTHER } from '../owners.js';

// Inline owner/assignee combo: predefined people plus "אחר…" (prompts for a
// custom name). A current value not in the list is kept as a selectable option
// so it still displays. `placeholder` is the empty-state label.
export default function OwnerSelect({ value, onChange, placeholder = 'בחר/י…' }) {
  const current = value || '';
  const inList = OWNERS.includes(current);
  const selectValue = current === '' ? '' : inList ? current : '__current__';
  return (
    <select
      value={selectValue}
      onChange={(e) => {
        const v = e.target.value;
        if (v === OTHER) {
          const name = window.prompt('שם:', inList ? '' : current);
          if (name && name.trim() && name.trim() !== current) onChange(name.trim());
        } else if (v !== '__current__' && v !== current) {
          onChange(v);
        }
      }}
    >
      {current === '' && <option value="">{placeholder}</option>}
      {!inList && current !== '' && <option value="__current__">{current}</option>}
      {OWNERS.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      <option value={OTHER}>אחר…</option>
    </select>
  );
}
