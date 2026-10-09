import { NextResponse } from "next/server";
import { DEFAULT_SCENARIO, getBenchmark, getSettings, getSite } from "@/lib/db/repository";
import { analyse } from "@/lib/domain/scoring";
import { recommend } from "@/lib/domain/recommendation";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const [site, benchmark, settings] = await Promise.all([getSite(slug), getBenchmark(), getSettings()]);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  const analysis = analyse(site.latest, benchmark, settings);
  return NextResponse.json({ site, benchmark, analysis, recommendation: recommend(analysis, site.latest, benchmark, DEFAULT_SCENARIO, settings) });
}
