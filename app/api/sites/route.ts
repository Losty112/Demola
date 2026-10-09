import { NextResponse } from "next/server";
import { getNetwork } from "@/lib/db/repository";

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
