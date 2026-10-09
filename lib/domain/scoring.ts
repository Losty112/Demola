import { METRIC_BY_KEY, SCORED_METRICS } from "./metrics";
import type { Analysis, Benchmark, MetricScore, ScoredKey, Settings, Snapshot, StatusKey } from "./types";

export function scoreValue(key: ScoredKey, value: number, benchmark: number, cap: number): number {
  const dir = METRIC_BY_KEY[key].direction;
  if (value <= 0) return dir === "lower" ? cap : 0;
  const raw = dir === "higher" ? (value / benchmark) * 100 : (benchmark / value) * 100;
  return Math.max(0, Math.min(cap, raw));
}

export function statusOf(score: number, s: Pick<Settings, "parThreshold" | "watchThreshold">): StatusKey {
  if (score >= s.parThreshold) return "par";
  if (score >= s.watchThreshold) return "watch";
  return "gap";
}

export function analyse(snap: Snapshot, bench: Benchmark, settings: Settings): Analysis {
  const scores: MetricScore[] = SCORED_METRICS.map(({ key }) => {
    const value = snap[key];
    const score = scoreValue(key, value, bench[key], settings.scoreCap);
    return { key, value, benchmark: bench[key], score, status: statusOf(score, settings) };
  });

  const average = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  const gaps = scores.filter((s) => s.status === "gap").length;
  const worst = scores.reduce((a, b) => (b.score < a.score ? b : a));

  const totalArea = snap.beds * snap.areaPerBed;
  const bedsNeeded = Math.ceil((snap.beds * snap.occupancy) / bench.occupancy);
  const spaceAboveNeed = Math.max(0, totalArea - bench.areaPerBed * bedsNeeded);

  return {
    scores,
    average,
    gaps,
    worst,
    totalArea,
    bedsNeeded,
    surplusBeds: snap.beds - bedsNeeded,
    spaceAboveNeed,
    spaceAboveNeedCost: spaceAboveNeed * snap.costPerM2,
    costGap: Math.max(0, (snap.costPerM2 - bench.costPerM2) * totalArea),
    admissions: (snap.beds * 365 * snap.occupancy) / 100 / settings.alosDays,
  };
}
