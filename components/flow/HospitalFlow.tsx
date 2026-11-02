"use client";
import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SiteWorkbench } from "@/components/site/SiteWorkbench";
import type { Benchmark, ScenarioInput, Settings, Snapshot } from "@/lib/domain/types";
import { StartScreen, type Path } from "./StartScreen";
import { OwnerForm } from "./OwnerForm";
import { BuilderForm, planToSnapshot, type BuildPlan } from "./BuilderForm";
import { BuildSizing } from "./BuildSizing";
import { Stepper } from "./fields";
import { BackgroundVideo } from "./BackgroundVideo";

/** Server-rendered sections handed in from `app/page.tsx` (they need database data). */
export interface FlowSlots {
  network: ReactNode;
  sites: ReactNode;
  compare: ReactNode;
  closure: ReactNode;
  data: ReactNode;
}

type Stage = "start" | "data" | "overview";

/** Tabs: arrow keys move between them, only the active panel is rendered. */
function Tabs({ tabs, label }: { tabs: { id: string; label: string; content: ReactNode }[]; label: string }) {
  const [active, setActive] = useState(tabs[0].id);
  const uid = useId();
  const idx = Math.max(0, tabs.findIndex((t) => t.id === active));
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = tabs[(idx + d + tabs.length) % tabs.length].id;
    setActive(next);
    document.getElementById(`${uid}-tab-${next}`)?.focus();
  };
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label={label} onKeyDown={onKey} className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white/5 p-1">
        {tabs.map((t) => (
          <button key={t.id} id={`${uid}-tab-${t.id}`} role="tab" type="button" aria-selected={t.id === active} aria-controls={`${uid}-panel`} tabIndex={t.id === active ? 0 : -1}
            onClick={() => setActive(t.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-500 ${t.id === active ? "bg-brand-500 text-white" : "text-muted hover:bg-brand-50 hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {/* keyed by tab: the panel animates in every time you switch */}
      <div key={active} id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${active}`} className="rise">{tabs[idx].content}</div>
    </div>
  );
}

/**
 * The whole app as one page with three stages (no sub-pages):
 *   1. start     – "I own a hospital" or "I want to build a hospital"
 *   2. data      – the form that fits the choice
 *   3. overview  – results in tabs; "Edit data" and "Start over" are always at hand
 */
export function HospitalFlow({ benchmark, settings, scenario, slots }: {
  benchmark: Benchmark; settings: Settings; scenario: ScenarioInput; slots: FlowSlots;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("start");
  const [path, setPath] = useState<Path>("own");
  const [own, setOwn] = useState<{ name: string; snap: Snapshot } | null>(null);
  const [build, setBuild] = useState<{ name: string; plan: BuildPlan } | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const goto = (s: Stage) => { setStage(s); window.scrollTo({ top: 0 }); };
  const reset = () => { setOwn(null); setBuild(null); setSaveMsg(null); goto("start"); };

  // The header logo asks the flow to go back to the start screen
  useEffect(() => {
    const home = () => { setOwn(null); setBuild(null); setSaveMsg(null); setStage("start"); window.scrollTo({ top: 0, behavior: "smooth" }); };
    window.addEventListener("app:home", home);
    return () => window.removeEventListener("app:home", home);
  }, []);

  const save = async () => {
    if (!own) return;
    setSaveMsg(null);
    const res = await fetch("/api/sites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: own.name, snapshot: own.snap }) });
    if (res.ok) { setSaveMsg({ ok: true, text: `Saved “${own.name}” to the network.` }); router.refresh(); }
    else setSaveMsg({ ok: false, text: (await res.json().catch(() => null))?.error ?? "Could not save." });
  };

  if (stage === "start") return (
    <>
      <BackgroundVideo dim="hero" />
      <StartScreen onChoose={(p) => { setPath(p); goto("data"); }} />
    </>
  );

  const labels = ["Choose", "Enter data", "Overview"];
  const name = path === "own" ? own?.name : build?.name;
  const ghost = "rounded-xl border border-brand-200 bg-white/5 px-4 py-2 text-sm font-semibold text-brand-700 backdrop-blur hover:border-brand-400 hover:bg-brand-100";

  return (
    <>
      <BackgroundVideo dim="reading" />
      {/* No panel behind the content: dark glass cards sit directly on the dimmed video */}
      <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 pb-20 pt-24 sm:px-6">
        <div className="fade-in flex flex-wrap items-center justify-between gap-3">
          <Stepper current={stage === "data" ? 1 : 2} labels={labels} />
          <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">{path === "own" ? "I own a hospital" : "I want to build a hospital"}</span>
        </div>

        {/* keyed by stage: each stage animates in when you click through */}
        <div key={stage} className="rise">
          {stage === "data" && path === "own" && (
            <OwnerForm benchmark={benchmark} initial={own ?? undefined} onBack={reset} onSubmit={(n, s) => { setOwn({ name: n, snap: s }); goto("overview"); }} />
          )}
          {stage === "data" && path === "build" && (
            <BuilderForm benchmark={benchmark} settings={settings} initial={build ?? undefined} onBack={reset} onSubmit={(n, p) => { setBuild({ name: n, plan: p }); goto("overview"); }} />
          )}

          {stage === "overview" && name && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-4xl tracking-wide text-ink sm:text-6xl">Overview · {name}</h1>
                  <p className="text-sm text-muted">{path === "own" ? "How your hospital compares with the benchmark, and what a change would do." : "What the area needs, and how the plan compares with the benchmark."}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {path === "own" && <button type="button" onClick={save} className={ghost}>Save to network</button>}
                  <button type="button" onClick={() => goto("data")} className={ghost}>Edit data</button>
                  <button type="button" onClick={reset} className="rounded-xl px-4 py-2 text-sm font-medium text-muted hover:bg-white/10 hover:text-ink">Start over</button>
                </div>
              </div>
              {saveMsg && <p role="status" className={`text-sm ${saveMsg.ok ? "text-par" : "text-gap"}`}>{saveMsg.text}</p>}

              {path === "own" && own && (
                <Tabs label="Overview sections" tabs={[
                  { id: "hospital", label: "Your hospital", content: <SiteWorkbench key={JSON.stringify(own)} name={own.name} history={[own.snap]} benchmark={benchmark} settings={settings} initialScenario={scenario} /> },
                  { id: "closure", label: "Ward closure", content: slots.closure },
                  { id: "network", label: "Network", content: slots.network },
                  { id: "sites", label: "Sites & compare", content: <div className="space-y-8">{slots.sites}{slots.compare}</div> },
                  { id: "data", label: "Benchmark & data", content: slots.data },
                ]} />
              )}
              {path === "build" && build && (
                <Tabs label="Overview sections" tabs={[
                  { id: "plan", label: "Your plan", content: (
                    <div className="space-y-6">
                      <BuildSizing plan={build.plan} />
                      <SiteWorkbench key={JSON.stringify(build)} name={build.name} history={[planToSnapshot(build.plan)]} benchmark={benchmark} settings={settings} initialScenario={scenario} plan />
                    </div>
                  ) },
                  { id: "data", label: "Benchmark & data", content: slots.data },
                ]} />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
