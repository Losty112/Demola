import { getReference } from "@/lib/db/repository";
import { Benchmark } from "@/components/hospital/pages/Benchmark";

export const metadata = { title: "Benchmark · Benchmark Hospital" };

export default async function Page() {
  return <Benchmark reference={await getReference()} />;
}
