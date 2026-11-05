import { Icon } from './Icon';

export function AiTag({ label = 'הוצע ע״י AI' }: { label?: string }) {
  return (
    <span className="tag ai">
      <Icon name="sparkle" size={11} filled />
      {label}
    </span>
  );
}
