"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Network overview" },
  { href: "/sites/site-a-north", label: "Site analysis", match: "/sites" },
  { href: "/compare", label: "Compare sites" },
  { href: "/data", label: "Benchmark & data" },
];

export function TopNav({ demo }: { demo: boolean }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          Benchmark Hospital
        </Link>
        <nav className="ml-2 hidden gap-1 md:flex">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.match ?? l.href);
            return (
              <Link key={l.href} href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-brand-50 text-brand-600" : "text-muted hover:bg-brand-50 hover:text-ink"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        {demo && <span className="ml-auto rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">Prototype · illustrative data</span>}
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-3 py-1 text-sm text-muted">{l.label}</Link>
        ))}
      </nav>
    </header>
  );
}
