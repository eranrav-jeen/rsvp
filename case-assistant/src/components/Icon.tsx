import type { CSSProperties } from 'react';

export type IconName =
  | 'sparkle' | 'check' | 'alert' | 'x' | 'clock' | 'file' | 'eye' | 'send'
  | 'user' | 'pencil' | 'mic' | 'arrow' | 'image' | 'star';

const P = (d: string) => <path d={d} />;

const SHAPES: Record<IconName, JSX.Element> = {
  sparkle: P('M12 2l2.2 6.6L21 11l-6.8 2.3L12 20l-2.2-6.7L3 11l6.8-2.4z'),
  check: P('M20 6 9 17l-5-5'),
  alert: <>{P('M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z')}{P('M12 9v4M12 17h.01')}</>,
  x: P('M18 6 6 18M6 6l12 12'),
  clock: <><circle cx="12" cy="12" r="9" />{P('M12 7v5l3 2')}</>,
  file: <>{P('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z')}{P('M14 2v6h6M8 13h8M8 17h5')}</>,
  eye: <>{P('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z')}<circle cx="12" cy="12" r="3" /></>,
  send: P('M22 2 11 13M22 2l-7 20-4-9-9-4z'),
  user: <><circle cx="12" cy="8" r="4" />{P('M20 21a8 8 0 0 0-16 0')}</>,
  pencil: P('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'),
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" />{P('M19 10v2a7 7 0 0 1-14 0v-2M12 19v3')}</>,
  arrow: P('M19 12H5M12 19l-7-7 7-7'),
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" />{P('m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21')}</>,
  star: P('M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9z'),
};

export function Icon({ name, size = 16, filled = false, className, style }: {
  name: IconName; size?: number; filled?: boolean; className?: string; style?: CSSProperties;
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={filled ? 0 : 1.75} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" className={className} style={{ flex: 'none', ...style }}
    >
      {SHAPES[name]}
    </svg>
  );
}
