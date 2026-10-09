import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DEFAULT_SCENARIO, getBenchmark, getSettings, getSite, listSites } from "@/lib/db/repository";
import { SiteWorkbench } from "@/components/site/SiteWorkbench";

export async function generateMetadata({ params }: PageProps<"/sites/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const site = await getSite(slug);
  return { title: site ? `${site.name} · Benchmark Hospital` : "Site not found" };
}

export default async function SitePage({ params }: PageProps<"/sites/[slug]">) {
  const { slug } = await params;
  const [site, benchmark, settings, all] = await Promise.all([getSite(slug), getBenchmark(), getSettings(), listSites()]);
  if (!site) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-brand-600 hover:underline">← Network overview</Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{site.name}</h1>
          <p className="text-sm text-muted">{site.kind} · {site.region} region · {site.history.length} reporting periods</p>
        </div>
        <nav className="flex flex-wrap gap-1.5" aria-label="Switch site">
          {all.map((s) => (
            <Link key={s.slug} href={`/sites/${s.slug}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${s.slug === slug ? "bg-brand-500 text-white" : "bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"}`}>
              {s.name.split(" – ")[0]}
            </Link>
          ))}
        </nav>
      </div>
      <SiteWorkbench key={site.slug} name={site.name} history={site.history} benchmark={benchmark} settings={settings} initialScenario={DEFAULT_SCENARIO} />
    </div>
  );
}
