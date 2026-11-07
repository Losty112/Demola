"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useHospital } from "@/lib/hospital/store";

export const NAV: { href: string; label: string; icon: IconName; soon?: boolean }[] = [
  { href: "/hospital", label: "My hospital", icon: "hospital" },
  { href: "/patients", label: "Patients", icon: "person" },
  { href: "/wards", label: "Wards", icon: "bed" },
  { href: "/staff", label: "Doctors & staff", icon: "doctor" },
  { href: "/energy", label: "Energy", icon: "bolt" },
  { href: "/compare", label: "Compare", icon: "compare" },
  { href: "/scenarios", label: "What if", icon: "cone", soon: true },
  { href: "/benchmark", label: "Benchmark", icon: "layers" },
  { href: "/upload", label: "Upload", icon: "upload" },
];

/** Navigation bar on every page: logo (back to the start), the pages, and the active hospital profile. */
export function TopNav({ demo }: { demo: boolean }) {
  const pathname = usePathname();
  const { ready, profile } = useHospital();
  const active = useRef<HTMLAnchorElement>(null);
  // On narrow screens the link row scrolls: keep the current page in view
  useEffect(() => { active.current?.scrollIntoView({ block: "nearest", inline: "center" }); }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-night/92 text-white backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1320px] items-center gap-3 px-4 pt-2.5 sm:px-6 xl:pb-2.5">
        <Link href="/" aria-label="Benchmark Hospital – start page"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-wide focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-white/40">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          <span className="hidden sm:inline xl:hidden 2xl:inline">Benchmark Hospital</span>
        </Link>
        <nav aria-label="Pages" className="hidden min-w-0 flex-1 overflow-x-auto xl:block">
          <NavLinks pathname={pathname} activeRef={active} />
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {demo && <span className="hidden rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white/70 2xl:inline">Demo data</span>}
          <Link href="/profile" className="flex max-w-[220px] items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium hover:border-brand-400 hover:bg-brand-500/20 focus-visible:outline-2 focus-visible:outline-glow">
            <Icon name="user" className="h-4 w-4 shrink-0" />
            <span className="truncate">{!ready ? "…" : profile ? profile.name : "Sign in"}</span>
          </Link>
        </div>
      </div>
      {/* Phones and tablets: the page links get their own scrolling row */}
      <nav aria-label="Pages" className="mx-auto w-full max-w-[1320px] overflow-x-auto px-4 pb-2 pt-2 sm:px-6 xl:hidden">
        <NavLinks pathname={pathname} activeRef={active} />
      </nav>
    </header>
  );
}

function NavLinks({ pathname, activeRef }: { pathname: string; activeRef: React.RefObject<HTMLAnchorElement | null> }) {
  return (
    <ul className="flex items-center gap-0.5 whitespace-nowrap">
      {NAV.map((n) => {
        const on = pathname === n.href || pathname.startsWith(`${n.href}/`);
        return (
          <li key={n.href}>
            <Link href={n.href} ref={on ? activeRef : undefined} aria-current={on ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-glow ${on ? "bg-brand-500 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
              <Icon name={n.icon} className="h-4 w-4" />
              {n.label}
              {n.soon && <span className="rounded bg-watch/20 px-1 text-[9px] font-bold uppercase tracking-wide text-watch" title="Under construction">wip</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
