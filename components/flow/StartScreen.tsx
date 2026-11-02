"use client";
import { WARDS } from "@/lib/closure/data";
import { enrichWard } from "@/lib/closure/engine";
import { CountUp } from "./CountUp";
import { FloorPlan } from "./FloorPlan";
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
        <p className="rise mb-3 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-glow/90" style={{ animationDelay: "0.3s" }}>
          <span className="h-px w-8 bg-glow/80" aria-hidden="true" /> Digital twin · benchmark model
        </p>
        <h1 id="hero-title" className="font-display rise text-[clamp(4rem,11vw,9rem)] leading-[0.82] tracking-wide" style={{ animationDelay: "0.4s" }}>
          Benchmark<br />Hospital
        </h1>
        <p className="rise mt-5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base" style={{ animationDelay: "0.55s" }}>
          See the real need of a hospital before a decision is made — to keep it, change it, close a ward or build a new one.
        </p>
        <div className="rise mt-6 flex flex-wrap gap-3" style={{ animationDelay: "0.7s" }}>
          <button type="button" onClick={() => onChoose("own")}
            className="group rounded-full bg-white px-7 py-3.5 text-left text-night shadow-lg transition hover:bg-glow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <span className="block text-sm font-semibold">I own a hospital</span>
            <span className="block text-xs text-night/60">Compare it, test a ward closure →</span>
          </button>
          <button type="button" onClick={() => onChoose("build")}
            className="rounded-full border border-white/50 bg-white/5 px-7 py-3.5 text-left backdrop-blur transition hover:border-glow hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <span className="block text-sm font-semibold">I want to build a hospital</span>
            <span className="block text-xs text-white/65">Size beds, space and cost →</span>
          </button>
        </div>
      </div>

      {/* Bottom bar: floor plan on a light panel, figures on a dark one (the colours flip on hover, like the day/night switch in the reference) */}
      <div className="rise group mx-auto grid w-full max-w-[1240px] md:grid-cols-[minmax(240px,1fr)_2.2fr]" style={{ animationDelay: "0.85s" }}>
        <div className="ticks hidden bg-[#ececea] p-4 text-night transition-colors duration-700 group-hover:bg-night group-hover:text-white md:block">
          <FloorPlan className="h-28 w-full" />
        </div>
        <dl className="ticks grid grid-cols-3 gap-2 bg-night/90 px-5 py-4 backdrop-blur-md transition-colors duration-700 group-hover:bg-[#ececea] group-hover:text-night sm:px-8">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-[10px] uppercase leading-tight tracking-widest text-white/55 group-hover:text-night/60">{s.label}</dt>
              <dd className="font-display mt-1 text-4xl leading-none sm:text-6xl">{s.value}</dd>
              <dd className="mt-1 hidden text-xs text-white/50 group-hover:text-night/55 sm:block">{s.hint}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
