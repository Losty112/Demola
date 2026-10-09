import Link from "next/link";
import { SCORED_METRICS } from "@/lib/domain/metrics";
import type { NetworkSite } from "@/lib/db/repository";

/** Red → amber → green, blue-tinted neutral for >100. Colour is derived from the % of benchmark. */
function cellColor(score: number): { bg: string; fg: string } {
  if (score >= 95) return { bg: "#d9f4ea", fg: "#0b6b51" };
  if (score >= 85) return { bg: "#e9f6df", fg: "#3d6b12" };
  if (score >= 75) return { bg: "#fdf0d5", fg: "#8a5a06" };
  if (score >= 60) return { bg: "#fde0cf", fg: "#9a4310" };
  return { bg: "#fbd9db", fg: "#a1272c" };
}

export function NetworkHeatmap({ sites }: { sites: NetworkSite[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-1 text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="px-2 py-1 text-left font-medium">Site</th>
            {SCORED_METRICS.map((m) => <th key={m.key} className="px-1 py-1 font-medium">{m.short}</th>)}
            <th className="px-2 py-1 font-medium">Average</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.slug}>
              <td className="whitespace-nowrap px-2 py-1.5 font-medium">
                <Link href={`/sites/${s.slug}`} className="text-brand-600 hover:underline">{s.name}</Link>
              </td>
              {s.analysis.scores.map((sc) => {
                const c = cellColor(sc.score);
                return (
                  <td key={sc.key} className="rounded-lg px-1 py-2 text-center text-xs font-semibold tabular-nums" style={{ background: c.bg, color: c.fg }}
                    title={`${sc.value} vs benchmark ${sc.benchmark}`}>
                    {Math.round(sc.score)}%
                  </td>
                );
              })}
              <td className="rounded-lg px-2 py-2 text-center text-xs font-bold tabular-nums" style={{ background: cellColor(s.analysis.average).bg, color: cellColor(s.analysis.average).fg }}>
                {Math.round(s.analysis.average)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">Each cell is the site’s value as % of the benchmark hospital (100% = on par, higher is better for every metric).</p>
    </div>
  );
}
