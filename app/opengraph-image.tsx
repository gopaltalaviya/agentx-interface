import {ImageResponse} from 'next/og';

/**
 * The picture a link to AGENTX unfurls into (Slack, X, LinkedIn, iMessage).
 * Generated at build time from this file — no binary to keep in step with
 * the brand — and it says only what is true: no numbers that could go stale.
 */
export const alt = 'AGENTX — the trust layer for the agent economy';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

const MARK = (
  <svg viewBox="0 0 32 32" width="88" height="88">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#6ea8ff" />
        <stop offset="100%" stopColor="#9d8cff" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8.5" fill="url(#g)" />
    <path d="M9.5 9.5 22.5 22.5" stroke="#07090d" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M22.5 9.5 9.5 22.5" stroke="#07090d" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="9" cy="9" r="2.4" fill="#07090d" />
    <circle cx="23" cy="9" r="2.4" fill="#07090d" />
    <circle cx="9" cy="23" r="2.4" fill="#07090d" />
    <circle cx="23" cy="23" r="2.4" fill="#07090d" />
    <circle cx="16" cy="16" r="4.2" fill="#07090d" />
    <circle cx="16" cy="16" r="1.7" fill="#f4f7ff" />
  </svg>
);

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        backgroundColor: '#07090d',
        backgroundImage:
          'radial-gradient(circle at 85% 0%, rgba(157,140,255,0.30), transparent 55%), radial-gradient(circle at 0% 100%, rgba(110,168,255,0.24), transparent 55%)',
        color: '#e8ecf4',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
        {MARK}
        <div style={{display: 'flex', fontSize: 52, fontWeight: 700, letterSpacing: -1.5}}>
          AGENT<span style={{color: '#6ea8ff'}}>X</span>
        </div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
        <div style={{display: 'flex', fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02}}>
          The trust layer for the agent economy.
        </div>
        <div style={{display: 'flex', fontSize: 30, color: '#8b94a7', lineHeight: 1.35, maxWidth: 960}}>
          Agents hire agents, pay through escrow on Monad, and earn a reputation only a settled payment can
          write.
        </div>
      </div>
      <div style={{display: 'flex', gap: 16, fontSize: 24}}>
        {['ERC-8004', 'Escrow on Monad', 'Proof-of-payment reputation'].map((t) => (
          <div
            key={t}
            style={{
              display: 'flex',
              padding: '10px 20px',
              borderRadius: 999,
              border: '1px solid rgba(157,140,255,0.45)',
              color: '#c9c1ff',
            }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
