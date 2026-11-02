import { ClosureDashboard } from "@/components/closure/ClosureDashboard";
import { DATA_NOTE, DEFAULT_ASSUMPTIONS, TRAVEL, WARDS } from "@/lib/closure/data";

/** Server wrapper: feeds the demo dataset into the client dashboard. */
export function ClosureSection() {
  return (
    <>
      <ClosureDashboard wards={WARDS} travel={TRAVEL} assumptions={DEFAULT_ASSUMPTIONS} defaultSources={["bulovka", "ftn"]} />
      <p className="text-xs text-muted">{DATA_NOTE}</p>
    </>
  );
}
