import { Icon } from './Icon';

export type Status = 'ok' | 'warn' | 'miss';

export const STATUS_LABEL: Record<Status, string> = { ok: 'אומת', warn: 'דורש בדיקה', miss: 'חסר' };

export function StatusIcon({ status }: { status: Status }) {
  const name = status === 'ok' ? 'check' : status === 'warn' ? 'alert' : 'x';
  return (
    <span className={`status-ico ${status}`} aria-hidden="true">
      <Icon name={name} size={14} />
    </span>
  );
}

export function StatusPill({ status, text }: { status: Status; text?: string }) {
  return <span className={`pill ${status}`}>{text ?? STATUS_LABEL[status]}</span>;
}
