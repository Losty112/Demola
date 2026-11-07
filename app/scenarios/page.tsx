import { PageShell, UnderConstruction } from "@/components/hospital/shell";
import { ClosureSection } from "@/components/sections/ClosureSection";

export const metadata = { title: "What if scenarios · Benchmark Hospital" };

/** What if scenarios — under construction. The ward closure model lives here so the work done is kept. */
export default function Page() {
  return (
    <PageShell title="What if scenarios" icon="cone" badge={<UnderConstruction />}
      intro="This page is being built. More scenarios will follow; for now it holds the ward closure model: if one ward closes, where do its patients go?">
      <div className="rounded-2xl border border-watch/40 solid-watch p-4 text-sm text-ink/85">
        <b className="text-watch">Under construction.</b> The ward closure below uses its own demo network of Prague cardiology wards, not your hospital profile yet. Still to decide: keep this full version here, or shrink it to three steps on the Wards page.
      </div>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Ward closure</h2>
          <p className="text-sm text-muted">Four steps: baseline, closure selection, impact, redistribution plan.</p>
        </div>
        <ClosureSection />
      </div>
    </PageShell>
  );
}
