import { createRoot } from "react-dom/client";
import { ClosureDashboard } from "@/components/closure/ClosureDashboard";
import { DATA_NOTE, DEFAULT_ASSUMPTIONS, TRAVEL, WARDS } from "@/lib/closure/data";

/** Entry for the stand-alone preview (no server, no database): same component, same engine, demo data. */
createRoot(document.getElementById("root")!).render(
  <main className="mx-auto w-full max-w-[1240px] space-y-4 px-4 pb-16 pt-8 sm:px-6">
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">If one ward closes, where do its patients go?</h2>
      <p className="text-sm text-muted">Four steps: baseline, closure selection, impact, redistribution plan.</p>
    </div>
    <ClosureDashboard wards={WARDS} travel={TRAVEL} assumptions={DEFAULT_ASSUMPTIONS} defaultSources={["bulovka", "ftn"]} />
    <p className="text-xs text-muted">{DATA_NOTE}</p>
  </main>,
);
