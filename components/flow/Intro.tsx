"use client";
import { useEffect, useState } from "react";

/**
 * First-visit loader: thin progress line with a percentage counter that fades into the hero.
 * Skipped for returning visitors (this browser session) and for people who prefer reduced motion.
 */
export function Intro() {
  const [pct, setPct] = useState(0);
  const [gone, setGone] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("intro-seen") === "1"; sessionStorage.setItem("intro-seen", "1"); } catch { /* storage blocked: just play it */ }
    const skip = seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now(), dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      if (skip) { setGone(true); return; }
      const p = Math.min(1, (t - start) / dur);
      setPct(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else { setFade(true); setTimeout(() => setGone(true), 700); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (gone) return null;
  return (
    <div role="status" aria-label="Loading" className={`fixed inset-0 z-50 flex flex-col justify-end bg-night px-6 pb-10 text-white transition-opacity duration-700 sm:px-12 ${fade ? "opacity-0" : "opacity-100"}`}>
      <div className="font-display text-right text-2xl tracking-widest text-white/80">{pct}%</div>
      <div className="mt-2 h-px w-full bg-white/20"><div className="h-full bg-white" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
