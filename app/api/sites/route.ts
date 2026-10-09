import { NextResponse } from "next/server";
import { getNetwork, saveSiteSnapshot } from "@/lib/db/repository";
import { METRICS } from "@/lib/domain/metrics";
import type { Snapshot } from "@/lib/domain/types";

export async function GET() {
  const { sites, benchmark } = await getNetwork();
  return NextResponse.json({
    benchmark,
    sites: sites.map((s) => ({
      slug: s.slug, name: s.name, region: s.region, kind: s.kind, latest: s.latest,
      average: s.analysis.average, gaps: s.analysis.gaps, verdict: s.recommendation.verdict,
    })),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const snap = body?.snapshot as Partial<Snapshot> | undefined;
  if (!name || !snap) return NextResponse.json({ error: "name and snapshot are required" }, { status: 400 });
  if (!/^\d{4}-Q[1-4]$/.test(String(snap.period))) return NextResponse.json({ error: "period must look like 2026-Q3" }, { status: 400 });
  for (const m of METRICS) {
    const v = snap[m.key as keyof Snapshot];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return NextResponse.json({ error: `${m.label} must be a positive number` }, { status: 400 });
    if (m.unit === "%" && v > 100) return NextResponse.json({ error: `${m.label} must be 0–100` }, { status: 400 });
  }
  const slug = saveSiteSnapshot({ name, region: body.region, kind: body.kind, snapshot: snap as Snapshot });
  return NextResponse.json({ slug });
}
