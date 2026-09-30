import {ImageResponse} from 'next/og';

/** The home-screen icon on iOS: the mark, full bleed, generated at build. */
export const size = {width: 180, height: 180};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: 'linear-gradient(135deg, #6ea8ff, #9d8cff)',
      }}
    >
      <svg viewBox="0 0 32 32" width="180" height="180">
        <path d="M9.5 9.5 22.5 22.5" stroke="#07090d" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M22.5 9.5 9.5 22.5" stroke="#07090d" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="9" cy="9" r="2.4" fill="#07090d" />
        <circle cx="23" cy="9" r="2.4" fill="#07090d" />
        <circle cx="9" cy="23" r="2.4" fill="#07090d" />
        <circle cx="23" cy="23" r="2.4" fill="#07090d" />
        <circle cx="16" cy="16" r="4.2" fill="#07090d" />
        <circle cx="16" cy="16" r="1.7" fill="#f4f7ff" />
      </svg>
    </div>,
    size,
  );
}
