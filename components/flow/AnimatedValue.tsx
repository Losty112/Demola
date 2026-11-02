"use client";
import { useEffect, useRef, useState } from "react";

const NUM = /(\d[\d,]*(?:\.\d+)?)/g;

/** Count a formatted string's numbers up from 0 (or from the previous value when it changes). "€13.6M" -> €0.0M ... €13.6M */
function interpolate(text: string, from: number[] | null, t: number) {
  let i = 0;
  return text.replace(NUM, (m) => {
    const to = parseFloat(m.replace(/,/g, ""));
    const start = from?.[i] ?? 0;
    i++;
    const v = start + (to - start) * t;
    const dec = (m.split(".")[1] ?? "").length;
    const s = v.toFixed(dec);
    return m.includes(",") ? Number(s).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : s;
  });
}
const numbersOf = (text: string) => Array.from(text.matchAll(NUM), (m) => parseFloat(m[0].replace(/,/g, "")));

/**
 * Shows a formatted value (€, %, m², "38 of 38 beds") and counts its numbers up whenever it first
 * appears or changes. The final text is always the exact `text`; reduced-motion users get it instantly.
 */
export function AnimatedValue({ text, duration = 900 }: { text: string; duration?: number }) {
  const [shown, setShown] = useState(text);
  const prev = useRef<number[] | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { prev.current = numbersOf(text); return; }
    const from = prev.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setShown(p >= 1 ? text : interpolate(text, from, 1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    prev.current = numbersOf(text);
    return () => cancelAnimationFrame(raf);
  }, [text, duration]);
  return <span aria-label={text}>{shown}</span>;
}
