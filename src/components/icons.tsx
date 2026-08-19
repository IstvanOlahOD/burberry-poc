type IconProps = { className?: string };

export function UndoIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 9h10a5 5 0 0 1 0 10h-6" />
      <path d="M8 5 4 9l4 4" />
    </svg>
  );
}

export function RedoIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 9H10a5 5 0 0 0 0 10h6" />
      <path d="m16 5 4 4-4 4" />
    </svg>
  );
}

export function StartOverIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 12a8 8 0 1 1-2.5-5.8" />
      <path d="M20 4v4h-4" />
    </svg>
  );
}

export function FullscreenIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 4H4v5" />
      <path d="M15 4h5v5" />
      <path d="M15 20h5v-5" />
      <path d="M9 20H4v-5" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

/** The dotted turntable hint shown under the model on first load. */
export function DragHintGraphic({ className }: IconProps) {
  // Rounded so the server and client agree on every attribute at hydration.
  const round = (value: number) => Math.round(value * 100) / 100;
  const dots = Array.from({ length: 26 }, (_, index) => {
    const angle = (index / 26) * Math.PI * 2;
    return {
      cx: round(271.5 + Math.cos(angle) * 250),
      cy: round(38.5 + Math.sin(angle) * 26),
      r: index % 2 === 0 ? 2 : 1.4,
    };
  });
  return (
    <svg viewBox="0 0 543 77" className={className} aria-hidden>
      <ellipse
        cx={271.5}
        cy={38.5}
        rx={250}
        ry={26}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="3 6"
        opacity={0.5}
      />
      {dots.map((dot, index) => (
        <circle key={index} cx={dot.cx} cy={dot.cy} r={dot.r} fill="currentColor" opacity={0.35} />
      ))}
    </svg>
  );
}
