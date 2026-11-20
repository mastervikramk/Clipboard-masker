import React from 'react'

interface AppLogoProps {
  className?: string
  size?: number
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = 'w-5 h-5', size = 32 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0E121B" />
          <stop offset="100%" stopColor="#1A2232" />
        </linearGradient>
        <linearGradient id="eraserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="60%" stopColor="#0A84FF" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Container */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="14"
        fill="url(#logoBg)"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1.5"
      />

      {/* Clipboard Plate Outline */}
      <rect
        x="13"
        y="12"
        width="38"
        height="44"
        rx="5"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.2"
      />

      {/* Top Clip */}
      <rect x="25" y="9" width="14" height="6" rx="2" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />

      {/* Normal Text Line */}
      <rect x="18" y="22" width="22" height="2.5" rx="1.2" fill="rgba(255,255,255,0.3)" />

      {/* Redacted Sensitive PII Bar (Left) */}
      <rect x="18" y="29" width="12" height="5" rx="1.5" fill="#FF3B30" opacity="0.9" />

      {/* Clean Sanitized Mask Bar (Right) */}
      <rect
        x="32"
        y="29"
        width="14"
        height="5"
        rx="1.5"
        fill="rgba(10,132,255,0.2)"
        stroke="#0A84FF"
        strokeWidth="1"
        strokeDasharray="2 1.5"
      />

      {/* Normal Text Line */}
      <rect x="18" y="38" width="18" height="2.5" rx="1.2" fill="rgba(255,255,255,0.3)" />

      {/* Active Angled Precision Eraser Tool */}
      <g transform="translate(30, 24) rotate(34)">
        {/* Stylus Handle */}
        <rect x="3" y="-3" width="16" height="6" rx="1.5" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
        {/* Eraser Tip */}
        <path d="M-4, -3 L3, -3 L3, 3 L-4, 3 L-6, 0 Z" fill="url(#eraserGrad)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
      </g>

      {/* Clean Sparkle */}
      <path
        d="M 33 24 Q 34.5 24 34.5 22.5 Q 34.5 24 36 24 Q 34.5 24 34.5 25.5 Q 34.5 24 33 24 Z"
        fill="#38BDF8"
      />
    </svg>
  )
}
