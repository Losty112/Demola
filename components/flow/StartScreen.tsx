"use client";
import { WARDS } from "@/lib/closure/data";
import { enrichWard } from "@/lib/closure/engine";
import { CountUp } from "./CountUp";
import { Intro } from "./Intro";

export type Path = "own" | "build";

const wards = WARDS.map(enrichWard);
const BEDS = wards.reduce((s, w) => s + w.beds, 0);
const OCC = Math.round((wards.reduce((s, w) => s + w.occ * w.beds, 0) / BEDS) * 100);

/**
 * Stage 1: the hero. Full-screen video behind a huge condensed title, two pill choices,
 * and a split info bar (floor-plan drawing | headline figures) at the bottom.
 */
export function StartScreen({ onChoose }: { onChoose: (p: Path) => void }) {
  const stats: { label: string; value: React.ReactNode; hint: string }[] = [
    { label: "Wards in the demo network", value: <CountUp to={wards.length} />, hint: "Prague cardiology" },
    { label: "Beds modelled", value: <CountUp to={BEDS} />, hint: "licensed, incl. CCU" },
    { label: "Average occupancy", value: <CountUp to={OCC} suffix="%" />, hint: "target band 85 %" },
  ];

  return (
    <section className="relative flex min-h-screen flex-col text-white" aria-labelledby="hero-title">
      <Intro />
      <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-center px-5 pb-5 pt-20 sm:px-8">
        <p className="rise mb-3 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-par" style={{ animationDelay: "0.3s" }}>
          <span className="h-px w-8 bg-par" aria-hidden="true" /> Digital twin · benchmark model
        </p>
        <h1 id="hero-title" className="font-display rise text-[clamp(4rem,11vw,9rem)] leading-[0.82] tracking-wide" style={{ animationDelay: "0.4s" }}>
          Benchmark<br />Hospital
        </h1>
        <p className="rise mt-5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base" style={{ animationDelay: "0.55s" }}>
          See the real need of a hospital before a decision is made — to keep it, change it, close a ward or build a new one.
        </p>
        <div className="rise mt-6 flex flex-wrap gap-3" style={{ animationDelay: "0.7s" }}>
          <button type="button" onClick={() => onChoose("own")}
            className="group rounded-full bg-white px-7 py-3.5 text-left text-night shadow-lg transition hover:bg-brand-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <span className="block text-sm font-semibold">I own a hospital</span>
            <span className="block text-xs text-night/60">Compare it, test a ward closure →</span>
          </button>
          <button type="button" onClick={() => onChoose("build")}
            className="rounded-full border border-white/50 bg-white/5 px-7 py-3.5 text-left backdrop-blur transition hover:border-brand-400 hover:bg-brand-500/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <span className="block text-sm font-semibold">I want to build a hospital</span>
            <span className="block text-xs text-white/65">Size beds, space and cost →</span>
          </button>
        </div>
      </div>

      {/* Only the figures, centred. No panel behind them: they count up slowly once the loader is gone */}
      <dl className="rise mx-auto grid w-full max-w-[1000px] grid-cols-3 gap-4 px-5 pb-12 pt-4 text-center [text-shadow:0_2px_24px_rgb(0_0_0/0.8)] sm:px-8" style={{ animationDelay: "0.85s" }}>
        {stats.map((s) => (
          <div key={s.label}>
            <dd className="font-display text-5xl leading-none sm:text-7xl lg:text-8xl">{s.value}</dd>
            <dt className="mt-2 text-[10px] uppercase leading-tight tracking-[0.25em] text-white/70 sm:text-xs">{s.label}</dt>
            <dd className="mt-1 hidden text-xs text-white/55 sm:block">{s.hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
