import { METRIC_BY_KEY } from "./metrics";
import { runScenarios } from "./scenarios";
import { formatEuro, formatInt } from "../format";
import type { Analysis, Benchmark, Recommendation, ScenarioInput, Settings, Snapshot, VerdictKey } from "./types";

export function recommend(
  a: Analysis,
  snap: Snapshot,
  bench: Benchmark,
  input: ScenarioInput,
  s: Settings,
): Recommendation {
  const sc = runScenarios(a, snap, input, s);
  const avg = formatInt(a.average);
  let verdict: VerdictKey;
  let headline: string;
  let text: string;

  if (a.average >= s.goodAverage && a.gaps === 0) {
    verdict = "good";
    headline = "Performance is good";
    text = "The site is at or close to benchmark on every metric. Keep its role in the network and keep monitoring.";
  } else if (a.average < s.closeAverage && a.gaps >= s.closeGaps) {
    if (input.extraTravelMin <= s.travelLimit) {
      verdict = "close";
      headline = "Consider closing or merging this site";
      text = `Average ${avg}% of benchmark with ${a.gaps} gaps. Closing would save about ${formatEuro(sc.closeSaving)} per year and affect about ${formatInt(sc.patientsClosed)} patients per year, with +${input.extraTravelMin} min travel.`;
    } else {
      verdict = "restructure";
      headline = "Should perform better – restructure urgently";
      text = `Average ${avg}% of benchmark with ${a.gaps} gaps. Closing would cause too much access impact (+${input.extraTravelMin} min travel), so downsize to core services and fix the biggest gaps first.`;
    }
  } else {
    verdict = "improve";
    headline = "Should perform better";
    text = `Average ${avg}% of benchmark with ${a.gaps} ${a.gaps === 1 ? "gap" : "gaps"}. Not a closure case, but a performance plan is needed.`;
  }

  const actions = [...a.scores]
    .sort((x, y) => x.score - y.score)
    .map((m) => ({
      key: m.key,
      status: m.status,
      score: m.score,
      keep: m.status === "par",
      action: METRIC_BY_KEY[m.key].action ?? "",
      now: m.value,
      target: bench[m.key],
    }));

  return { verdict, headline, text, actions };
}
