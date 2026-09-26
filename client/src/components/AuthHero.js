import React, { useEffect, useState } from 'react';
import Pulse from './Pulse';
import heroLifter from '../assets/hero-lifter.jpg';

// Animated left panel of the sign-in / sign-up page (the app's landing page).
//  • headline words slide up one by one, and the last word keeps cycling
//  • parallax: the artwork, headline and (on the form side) the backdrop and
//    form all shift with the mouse at different depths. AuthPage writes
//    --mx / --my (-1..1) on the page root; everything here just reads them
//  • an endless ticker along the bottom
// Purely decorative: no real user data, no numbers. All motion stops for
// users who prefer reduced motion (see index.css).
const WORDS = ['repeat.', 'recover.', 'rise.'];
const TICKER = ['Track nutrition', 'Train smarter', 'Sleep better', 'Drink more water', 'Hit your steps', 'Stay consistent'];

export default function AuthHero() {
  const [word, setWord] = useState(0);

  // Cycle the accent word
  useEffect(() => {
    const t = setInterval(() => setWord(i => (i + 1) % WORDS.length), 2400);
    return () => clearInterval(t);
  }, []);

  const line = (words, start) => words.map((w, i) => (
    <span key={w + i} className="ah-word"><span style={{ animationDelay: `${0.15 + (start + i) * 0.12}s` }}>{w}</span></span>
  ));

  return (
    <section className="auth-hero ah">
      {/* background artwork: fades in, slowly zooms, drifts against the mouse */}
      <div className="ah-bg" aria-hidden="true">
        <img src={heroLifter} alt="" />
      </div>
      <div className="brand">
        <div className="brand-mark">F</div>
        <span className="brand-name">FitPulse<b>.</b></span>
        <Pulse mood="wave" size={44} className="ah-pulse" />
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
