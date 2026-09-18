// Jeen brand logo: the three-square mark, optionally followed by the "Jeen"
// wordmark. Mark colors are fixed brand colors; the wordmark color adapts to
// the background via the `wordmarkColor` prop.
export default function JeenLogo({
  height = 30,
  showWordmark = true,
  wordmarkColor = 'var(--color-maroon)',
}) {
  return (
    <span className="jeen-logo" style={{ gap: Math.round(height * 0.3) }}>
      <svg
        width={height}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ flex: '0 0 auto' }}
      >
        <rect x="1" y="2" width="9" height="20" rx="3" fill="var(--logo-pink)" />
        <rect x="13" y="2" width="9" height="9" rx="3" fill="var(--logo-coral)" />
        <rect x="13" y="13" width="9" height="9" rx="3" fill="var(--logo-amber)" />
      </svg>
      {showWordmark && (
        <span
          className="jeen-wordmark"
          style={{ fontSize: Math.round(height * 0.9), color: wordmarkColor }}
        >
          Jeen
        </span>
      )}
    </span>
  );
}
