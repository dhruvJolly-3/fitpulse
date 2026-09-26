import React, { useEffect, useRef, useState } from 'react';
import Pulse from './Pulse';
import heroLifter from '../assets/hero-lifter.jpg';

// Animated left panel of the sign-in / sign-up page (the app's landing page).
//  • headline words slide up one by one, and the last word keeps cycling
//  • floating "live" cards: a 30-day calendar filling in, a progress ring,
//    growing week bars and a water wave. They drift, and follow the mouse
//    a little (parallax via the --mx / --my CSS variables)
//  • an endless ticker along the bottom
// Purely decorative: no real user data, no numbers. All motion stops for
// users who prefer reduced motion (see index.css).
const WORDS = ['repeat.', 'recover.', 'rise.'];
const TICKER = ['Track nutrition', 'Train smarter', 'Sleep better', 'Drink more water', 'Hit your steps', 'Stay consistent'];

export default function AuthHero() {
  const hero = useRef(null);
  const [word, setWord] = useState(0);

  // Cycle the accent word
  useEffect(() => {
    const t = setInterval(() => setWord(i => (i + 1) % WORDS.length), 2400);
    return () => clearInterval(t);
  }, []);

  // Mouse parallax: write the pointer position (-1..1) into CSS variables
  const onMove = (e) => {
    const r = hero.current.getBoundingClientRect();
    hero.current.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    hero.current.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };

  const line = (words, start) => words.map((w, i) => (
    <span key={w + i} className="ah-word"><span style={{ animationDelay: `${0.15 + (start + i) * 0.12}s` }}>{w}</span></span>
  ));

  return (
    <section className="auth-hero ah" ref={hero} onMouseMove={onMove}>
      {/* background artwork: fades in, slowly zooms, drifts against the mouse */}
      <div className="ah-bg" aria-hidden="true">
        <img src={heroLifter} alt="" />
      </div>
      <div className="brand">
        <div className="brand-mark">F</div>
        <span className="brand-name">FitPulse<b>.</b></span>
        <Pulse mood="wave" size={44} className="ah-pulse" />
      </div>

      {/* Two small HUD widgets, styled to sit inside the artwork (ink edges, steel glass, neon glint) */}
      <div className="ah-art" aria-hidden="true">
        <div className="ah-card ah-cal" style={{ '--d': 1.2 }}>
          <div className="ah-float">
            <span className="ah-k">30-day streak</span>
            <div className="ah-grid">
              {Array.from({ length: 28 }, (_, i) => (
                <i key={i} className={[2, 9, 16, 23].includes(i) ? 'rest' : ''} style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          </div>
        </div>

        <div className="ah-card ah-ring" style={{ '--d': 2.2 }}>
          <div className="ah-float" style={{ animationDelay: '-2s' }}>
            <svg viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" className="track" />
              <circle cx="40" cy="40" r="32" className="fill" />
            </svg>
            <span className="ah-k">kcal</span>
          </div>
        </div>

      </div>

      <div className="ah-copy">
        <h1>
          {line(['train.', 'eat.'], 0)}<br />
          {line(['sleep.'], 2)}{' '}
          <span className="ah-word ah-cycle">
            <span key={word} className="serif-it">{WORDS[word]}</span>
          </span>
        </h1>
        <p>Nutrition, training, hydration, sleep and steps, tracked in one place against targets built from your own body stats.</p>
      </div>

      {/* Endless ticker (content duplicated so the loop is seamless) */}
      <div className="ah-ticker" aria-hidden="true">
        <div className="ah-track">
          {[...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}<b>·</b></span>)}
        </div>
      </div>
    </section>
  );
}
