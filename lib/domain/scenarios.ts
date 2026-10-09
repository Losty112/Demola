import type { Analysis, ScenarioInput, ScenarioResult, Settings, Snapshot } from "./types";

export function runScenarios(a: Analysis, snap: Snapshot, input: ScenarioInput, s: Settings): ScenarioResult {
  const share = input.sharePct / 100;
  return {
    releaseSaving: a.spaceAboveNeed * snap.costPerM2 * s.releaseFactor,
    moveSaving: share * a.totalArea * snap.costPerM2 * s.moveFactor,
    closeSaving: a.totalArea * snap.costPerM2 * s.closeFactor,
    patientsMoved: a.admissions * share,
    patientsClosed: a.admissions,
  };
}
