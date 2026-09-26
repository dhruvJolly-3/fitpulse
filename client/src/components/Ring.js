import React from 'react';

// Circular progress ring (design: thick ink stroke on a faint track).
export default function Ring({ value, max, size = 196, stroke = 15, color = 'var(--ink)', track = 'rgba(14,14,16,0.16)', children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ - pct * circ} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          // --ring-circ lets the CSS `ringDraw` animation start from an empty ring
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.2,0.7,0.2,1)', '--ring-circ': circ }} />
      </svg>
      <div className="center">{children}</div>
    </div>
  );
}
