import { ClosureSection } from "@/components/sections/ClosureSection";

export const metadata = { title: "Ward closure scenario · Benchmark Hospital" };

/** Stand-alone page for the closure dashboard (also embedded as #closure on the home page). */
export default function ClosurePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">If one ward closes, where do its patients go?</h1>
        <p className="text-sm text-muted">Four steps: baseline, closure selection, impact, redistribution plan.</p>
      </div>
      <ClosureSection />
    </div>
  );
}
