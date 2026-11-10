import { Upload } from "@/components/hospital/pages/Upload";
import type { DatasetId } from "@/lib/hospital/datasets";

export const metadata = { title: "Upload · Benchmark Hospital" };

export default async function Page({ searchParams }: { searchParams: Promise<{ dataset?: string }> }) {
  const { dataset } = await searchParams;
  return <Upload initial={dataset as DatasetId | undefined} />;
}
