"use client";
import { useEffect, useState } from "react";

/**
 * Number that counts up slowly (ease in-out, about 4.5 s). If the first-visit loader is still playing it waits for it
 * to finish; otherwise it starts after a short pause. Static for visitors who prefer reduced motion.
 */
export function CountUp({ to, suffix = "", duration = 4500 }: { to: number; suffix?: string; duration?: number }) {
  const [v, setV] = useState(to);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, timer = 0;
    const run = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        setV(Math.round(to * (0.5 - 0.5 * Math.cos(Math.PI * p)))); // ease in and out: gentle start, steady middle, soft landing
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const loaderPlaying = document.documentElement.dataset.intro === "playing";
    if (loaderPlaying) window.addEventListener("intro:done", run, { once: true });
    else timer = window.setTimeout(run, 500);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); window.removeEventListener("intro:done", run); };
  }, [to, duration]);
  return <>{v.toLocaleString("en-US")}{suffix}</>;
}
