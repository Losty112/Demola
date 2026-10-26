import { NextResponse } from "next/server";
import { getSiteStats } from "@/lib/db/repository";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const stats = await getSiteStats(slug);
  if (!stats) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  return NextResponse.json(stats);
}
