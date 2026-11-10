"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { demoData } from "@/lib/hospital/demo";
import { deriveView } from "@/lib/hospital/derive";
import { actions } from "@/lib/hospital/store";
import { CountUp } from "./CountUp";
import { Intro } from "./Intro";

const demo = deriveView(demoData());

/**
 * The opening page: one main button ("My hospital"), "What if scenarios" (under construction) and a quick
 * login as the demo hospital with all data filled in. Figures at the bottom describe the demo hospital.
 */
export function StartScreen() {
  const router = useRouter();
  const stats: { label: string; value: React.ReactNode; hint: string }[] = [
    { label: "Wards", value: <CountUp to={demo.wards.length} />, hint: "in the demo hospital" },
    { label: "Beds", value: <CountUp to={demo.totals.beds ?? 0} />, hint: "licensed" },
    { label: "Patients a year", value: <CountUp to={demo.totals.admissions ?? 0} />, hint: "admissions, last 12 months" },
  ];

  return (
    <section className="relative flex min-h-screen flex-col text-white" aria-labelledby="hero-title">
      <Intro />
      <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-center px-5 pb-5 pt-32 sm:px-8 xl:pt-24">
        <p className="rise mb-3 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-par" style={{ animationDelay: "0.3s" }}>
          <span className="h-px w-8 bg-par" aria-hidden="true" /> For the hospital director
        </p>
        <h1 id="hero-title" className="font-display rise text-[clamp(4rem,11vw,9rem)] leading-[0.82] tracking-wide" style={{ animationDelay: "0.4s" }}>
          Benchmark<br />Hospital
        </h1>
        <p className="rise mt-5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base" style={{ animationDelay: "0.55s" }}>
          See where your hospital is under pressure — beds, staff, cost and energy — before you decide what to change.
        </p>
        <div className="rise mt-6 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.7s" }}>
          <Link href="/hospital"
            className="group rounded-full bg-white px-8 py-4 text-left text-night shadow-lg transition hover:bg-brand-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <span className="flex items-center gap-2 text-base font-semibold"><Icon name="hospital" /> My hospital</span>
            <span className="block text-xs opacity-60">Where is it under pressure? →</span>
          </Link>
          <Link href="/scenarios"
            className="rounded-full border border-white/50 bg-white/5 px-7 py-3.5 text-left backdrop-blur transition hover:border-brand-400 hover:bg-brand-500/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <span className="flex items-center gap-2 text-sm font-semibold">What if scenarios <span className="rounded bg-watch/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-watch">Under construction</span></span>
            <span className="block text-xs text-white/65">Close or shrink a ward, see the effect →</span>
          </Link>
          <button type="button" onClick={() => { actions.signInDemo(); router.push("/hospital"); }}
            className="rounded-full border border-par/60 bg-par/15 px-7 py-3.5 text-left backdrop-blur transition hover:bg-par/35 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <span className="flex items-center gap-2 text-sm font-semibold text-white"><Icon name="user" className="h-4 w-4" /> Log in as demo hospital</span>
            <span className="block text-xs text-white/65">All data already filled in →</span>
          </button>
        </div>
      </div>

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
