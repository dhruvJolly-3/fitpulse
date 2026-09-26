import React from 'react';

// "Pulse", the FitPulse mascot: a lime gym bro with a V-taper, a black tank
// top carrying the brand heartbeat, a sweatband and big biceps. Pure SVG + CSS (no image files, ~2KB), so it matches the brand
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
          <line className="p-leg p-leg-l" x1="47" y1="88" x2="45" y2="106" />
          <line className="p-leg p-leg-r" x1="73" y1="88" x2="75" y2="106" />
        </g>

        {/* left arm (+ prop) */}
        <g className="p-arm p-arm-l">
          <line className="p-limb" x1="27" y1="56" x2="14" y2="74" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <Bicep cx={22} cy={60} flip />
          {mood === 'lift' && <Dumbbell x={14} y={74} />}
        </g>

        {/* body */}
        <g className="p-body">
          {/* V-taper: broad shoulders, narrower waist */}
          <path d="M22 38Q22 20 40 20H80Q98 20 98 38L92 78Q90 92 76 92H44Q30 92 28 78Z" fill={LIME} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          {/* tank top: thin straps, deep cut so the lime chest shows */}
          <g fill={INK}>
            <path d="M33 24h7l3 34h-9z" /><path d="M80 24h7l-1 34h-9z" />
            <path d="M28 56Q60 66 92 56L90 78Q88 90 76 90H44Q32 90 30 78Z" />
          </g>
          {/* pecs */}
          <path d="M45 57Q52 61 60 57Q68 61 75 57" fill="none" stroke={INK} strokeWidth="2" opacity="0.35" strokeLinecap="round" />
          {/* heartbeat on the tank */}
          <path className="p-ecg" d="M42 76h8l3-6 4 11 3-5h16" fill="none" stroke={LIME} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
          {/* sweatband */}
          {!sleeping && <path d="M24 30Q24 24 32 24H88Q96 24 96 30V33H24Z" fill={CORAL} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />}
          {/* face */}
          {sleeping ? (
            <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M44 41q5 4 10 0" /><path d="M66 41q5 4 10 0" />
            </g>
          ) : (
            <>
              {/* determined brows */}
              <g stroke={INK} strokeWidth="3" strokeLinecap="round">
                <line x1="43" y1="36" x2="54" y2="38" /><line x1="66" y1="38" x2="77" y2="36" />
              </g>
              <g className="p-eyes" fill={INK}>
                <ellipse cx="49" cy="42" rx="3.5" ry="4" /><ellipse cx="71" cy="42" rx="3.5" ry="4" />
                <circle cx="50.3" cy="40.8" r="1.2" fill={CREAM} /><circle cx="72.3" cy="40.8" r="1.2" fill={CREAM} />
              </g>
            </>
          )}
          {/* cheeks */}
          <circle cx="41" cy="48" r="3" fill={CORAL} opacity="0.5" />
          <circle cx="79" cy="48" r="3" fill={CORAL} opacity="0.5" />
          {/* mouth */}
          {eating
            ? <ellipse className="p-mouth-eat" cx="60" cy="48" rx="4.5" ry="3.5" fill={INK} />
            : sleeping
              ? <circle cx="60" cy="48" r="2.2" fill={INK} />
              : (
                <g>
                  {/* confident grin */}
                  <path d="M50 46q10 9 20 0z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
                  <path d="M52 46.5h16v2.2q-8 2.2-16 0z" fill={CREAM} />
                </g>
              )}
          {/* sleep: night cap */}
          {sleeping && (
            <g>
              <path d="M26 30q6-24 42-18q14 2 24 18z" fill="#6f7bd8" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <circle cx="96" cy="27" r="5" fill={CREAM} stroke={INK} strokeWidth="2.5" />
            </g>
          )}
        </g>

        {/* right arm (+ prop) */}
        <g className="p-arm p-arm-r">
          <line className="p-limb" x1="93" y1="56" x2="106" y2="74" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <Bicep cx={98} cy={60} />
          {mood === 'lift' && <Dumbbell x={106} y={74} />}
          {mood === 'drink' && (
            <g>
              <path d="M100 62h14l-2 18h-10z" fill="#bfe3ff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path className="p-water" d="M101.5 68h11" stroke="#3aa0ff" strokeWidth="3" />
            </g>
          )}
          {eating && (
            <g>
              <line x1="106" y1="74" x2="100" y2="60" stroke={INK} strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="99" cy="58" rx="4" ry="3" fill={INK} />
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

// A lime bicep bump on the upper arm
function Bicep({ cx, cy, flip }) {
  return (
    <path className="p-bicep" transform={`translate(${cx} ${cy})${flip ? ' scale(-1 1)' : ''}`}
      d="M-6 -6Q2 -12 7 -3Q9 4 2 7Q-4 8 -7 2Z" fill={LIME} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
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
