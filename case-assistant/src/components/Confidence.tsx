export function Confidence({ value, prefix }: { value: number; prefix?: string }) {
  return (
    <span className="conf" aria-label={`רמת ביטחון ${value}%`}>
      <span aria-hidden="true">{prefix ? `${prefix} ` : ''}{value}%</span>
      <span className="conf-track" aria-hidden="true">
        <span className="conf-fill" style={{ width: `${value}%` }} />
      </span>
    </span>
  );
}
