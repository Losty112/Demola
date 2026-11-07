import { getReference } from "@/lib/db/repository";
import { Energy } from "@/components/hospital/pages/Energy";

export const metadata = { title: "Energy · Benchmark Hospital" };

export default async function Page() {
  return <Energy reference={await getReference()} />;
}
