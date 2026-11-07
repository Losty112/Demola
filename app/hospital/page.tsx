import { DEFAULT_SCENARIO, getReference } from "@/lib/db/repository";
import { MyHospital } from "@/components/hospital/pages/MyHospital";

export const metadata = { title: "My hospital · Benchmark Hospital" };

export default async function Page() {
  return <MyHospital reference={await getReference()} scenario={DEFAULT_SCENARIO} />;
}
