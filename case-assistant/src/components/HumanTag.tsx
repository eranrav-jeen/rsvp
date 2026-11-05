import { Icon } from './Icon';

export function HumanTag({ text }: { text: string }) {
  return (
    <span className="tag human">
      <Icon name="user" size={12} />
      {text}
    </span>
  );
}
