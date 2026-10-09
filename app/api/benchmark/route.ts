import { NextResponse } from "next/server";
import { getBenchmark, getSettings } from "@/lib/db/repository";

export async function GET() {
  const [benchmark, settings] = await Promise.all([getBenchmark(), getSettings()]);
  return NextResponse.json({ benchmark, settings });
}
