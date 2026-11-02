"use client";

export type Path = "own" | "build";

const OPTIONS: { path: Path; title: string; text: string; asks: string; icon: React.ReactNode }[] = [
  {
    path: "own", title: "I own a hospital",
    text: "See how your hospital performs against the benchmark hospital and what happens if a ward closes or patients move.",
    asks: "You enter: beds, occupancy, floor area, costs, operating rooms, energy, travel time.",
    icon: <path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6M12 8v4M10 10h4" />,
  },
  {
    path: "build", title: "I want to build a hospital",
    text: "Size a new hospital: how many beds, how much space and what running cost your region needs, checked against the benchmark.",
    asks: "You enter: catchment population, expected admissions, planned area and cost targets.",
    icon: <path d="M4 21h16M6 21V10l6-4 6 4v11M12 11v5M9.5 13.5h5M3 6l2-2M21 6l-2-2" />,
  },
];

/** Stage 1: one question, two big choices. What is asked next depends on the choice. */
export function StartScreen({ onChoose }: { onChoose: (p: Path) => void }) {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What brings you here?</h1>
        <p className="mx-auto max-w-xl text-muted">Choose one. We ask only for the numbers that fit your situation, then show you the overview.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <button key={o.path} type="button" onClick={() => onChoose(o.path)}
            className="group flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-6 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{o.icon}</svg>
            </span>
            <span className="text-xl font-semibold text-ink">{o.title}</span>
            <span className="text-sm text-ink/80">{o.text}</span>
            <span className="text-xs text-muted">{o.asks}</span>
            <span className="mt-auto pt-2 text-sm font-semibold text-brand-600 group-hover:underline">Continue →</span>
          </button>
        ))}
      </div>
    </div>
  );
}
