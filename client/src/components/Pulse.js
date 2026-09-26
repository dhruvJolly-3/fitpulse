import React from 'react';

// "Pulse", the FitPulse mascot: a lime squircle with the brand heartbeat on
// its belly. Pure SVG + CSS (no image files, ~2KB), so it matches the brand
// colours, works in dark mode and stays crisp at any size.
//
// mood:
//   run    – jogging (loading screen, Activity)
//   lift   – dumbbell curls (Training)
//   sleep  – snoozing with a night cap and floating Zs (Sleep)
//   drink  – sipping water (Hydration)
//   eat    – spooning from a bowl (Nutrition, Recipes)
//   cheer  – jumping with confetti (goals hit)
//   wave   – friendly hello (Dashboard, default)
// All motion stops for users who prefer reduced motion.
const INK = '#0e0e10';
const LIME = '#c9e265';
const CORAL = '#ff5b3d';
const CREAM = '#f1ebde';

export default function Pulse({ mood = 'wave', size = 96, className = '', title }) {
  const sleeping = mood === 'sleep';
  const eating = mood === 'eat';
  return (
    <svg className={`pulse pulse-${mood} ${className}`} width={size} height={size} viewBox="0 0 120 120"
      role="img" aria-label={title || `Pulse the mascot, ${mood}`}>
      {/* ground shadow */}
      <ellipse className="p-shadow" cx="60" cy="112" rx="26" ry="4" fill={INK} opacity="0.14" />

      <g className="p-all">
        {/* legs */}
        <g className="p-limb" stroke={INK} strokeWidth="6" strokeLinecap="round">
          <line className="p-leg p-leg-l" x1="48" y1="88" x2="46" y2="106" />
          <line className="p-leg p-leg-r" x1="72" y1="88" x2="74" y2="106" />
        </g>

        {/* left arm (+ prop) */}
        <g className="p-arm p-arm-l">
          <line className="p-limb" x1="31" y1="62" x2="18" y2="74" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          {mood === 'lift' && <Dumbbell x={18} y={74} />}
        </g>

        {/* body */}
        <g className="p-body">
          <rect x="28" y="24" width="64" height="68" rx="26" fill={LIME} stroke={INK} strokeWidth="4" />
          {/* belly heartbeat */}
          <path className="p-ecg" d="M44 80h7l3-6 4 11 3-5h14" fill="none" stroke={INK} strokeWidth="2.5" opacity="0.55"
            strokeLinecap="round" strokeLinejoin="round" />
          {/* face */}
          {sleeping ? (
            <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M44 48q5 4 10 0" /><path d="M66 48q5 4 10 0" />
            </g>
          ) : (
            <g className="p-eyes" fill={INK}>
              <ellipse cx="49" cy="47" rx="4" ry="5" /><ellipse cx="71" cy="47" rx="4" ry="5" />
              <circle cx="50.5" cy="45.5" r="1.4" fill={CREAM} /><circle cx="72.5" cy="45.5" r="1.4" fill={CREAM} />
            </g>
          )}
          {/* cheeks */}
          <circle cx="42" cy="56" r="3.5" fill={CORAL} opacity="0.55" />
          <circle cx="78" cy="56" r="3.5" fill={CORAL} opacity="0.55" />
          {/* mouth */}
          {eating
            ? <ellipse className="p-mouth-eat" cx="60" cy="58" rx="4.5" ry="3.5" fill={INK} />
            : sleeping
              ? <circle cx="60" cy="58" r="2.2" fill={INK} />
              : <path d="M51 56q9 10 18 0z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />}
          {/* run: sweatband */}
          {mood === 'run' && <rect x="30" y="31" width="60" height="7" rx="3.5" fill={CORAL} />}
          {/* sleep: night cap */}
          {sleeping && (
            <g>
              <path d="M34 34q6-22 36-16q10 2 18 16z" fill="#6f7bd8" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <circle cx="94" cy="30" r="5" fill={CREAM} stroke={INK} strokeWidth="2.5" />
            </g>
          )}
        </g>

        {/* right arm (+ prop) */}
        <g className="p-arm p-arm-r">
          <line className="p-limb" x1="89" y1="62" x2="102" y2="74" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          {mood === 'lift' && <Dumbbell x={102} y={74} />}
          {mood === 'drink' && (
            <g>
              <path d="M96 62h14l-2 18h-10z" fill="#bfe3ff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path className="p-water" d="M97.5 68h11" stroke="#3aa0ff" strokeWidth="3" />
            </g>
          )}
          {eating && (
            <g>
              <line x1="102" y1="74" x2="96" y2="60" stroke={INK} strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="95" cy="58" rx="4" ry="3" fill={INK} />
            </g>
          )}
        </g>
      </g>

      {/* props that don't move with the body */}
      {eating && (
        <g className="p-bowl">
          <path d="M8 96h30q-2 12-15 12t-15-12z" fill={CREAM} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path className="p-steam" d="M16 90q3-4 0-8M24 90q3-4 0-8M32 90q3-4 0-8" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </g>
      )}
      {sleeping && (
        <g className="p-zs" fill={INK} fontFamily="var(--display, sans-serif)" fontWeight="800">
          <text className="p-z p-z1" x="92" y="22" fontSize="12">z</text>
          <text className="p-z p-z2" x="100" y="14" fontSize="15">z</text>
          <text className="p-z p-z3" x="108" y="6" fontSize="18">Z</text>
        </g>
      )}
      {mood === 'run' && (
        <g className="p-speed p-limb" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.35">
          <line x1="4" y1="50" x2="18" y2="50" /><line x1="0" y1="62" x2="16" y2="62" /><line x1="6" y1="74" x2="18" y2="74" />
        </g>
      )}
      {mood === 'cheer' && (
        <g className="p-confetti">
          <rect x="14" y="14" width="6" height="6" rx="1" fill={CORAL} />
          <rect x="100" y="18" width="6" height="6" rx="1" fill={LIME} stroke={INK} strokeWidth="1.5" />
          <circle cx="24" cy="36" r="3" fill="#6f7bd8" />
          <circle cx="98" cy="40" r="3" fill={CORAL} />
          <rect x="58" y="4" width="5" height="5" rx="1" fill="#6f7bd8" />
        </g>
      )}
    </svg>
  );
}

function Dumbbell({ x, y }) {
  return (
    <g className="p-prop" transform={`translate(${x} ${y})`}>
      <line x1="-9" y1="0" x2="9" y2="0" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <rect x="-13" y="-6" width="6" height="12" rx="2" fill={INK} />
      <rect x="7" y="-6" width="6" height="12" rx="2" fill={INK} />
    </g>
  );
}
