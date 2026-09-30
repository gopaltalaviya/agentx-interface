import {useId} from 'react';

/**
 * The AGENTX mark: four agents, their lines crossing at one point — the
 * escrow every payment passes through. It is the product in one glyph, and
 * it stays legible at 16 px because it is two strokes and five dots.
 *
 * The same geometry is in app/icon.svg (favicon) and docs/brand/*.svg; if
 * one changes, change all three.
 */
export function LogoMark({className = 'size-7', title}: {className?: string; title?: string}) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ea8ff" />
          <stop offset="100%" stopColor="#9d8cff" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8.5" fill={`url(#${id}-g)`} />
      <g stroke="#07090d" strokeWidth="2.6" strokeLinecap="round">
        <path d="M9.5 9.5 22.5 22.5" />
        <path d="M22.5 9.5 9.5 22.5" />
      </g>
      <g fill="#07090d">
        <circle cx="9" cy="9" r="2.4" />
        <circle cx="23" cy="9" r="2.4" />
        <circle cx="9" cy="23" r="2.4" />
        <circle cx="23" cy="23" r="2.4" />
        <circle cx="16" cy="16" r="4.2" />
      </g>
      <circle cx="16" cy="16" r="1.7" fill="#f4f7ff" />
    </svg>
  );
}

/** Mark + wordmark, as used in the header and footer. */
export function Logo({className = ''}: {className?: string}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="size-7 transition-transform duration-300 group-hover:rotate-[8deg]" />
      <span className="text-lg font-semibold tracking-tight">
        AGENT<span className="text-accent">X</span>
      </span>
    </span>
  );
}
