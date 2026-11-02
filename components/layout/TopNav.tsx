"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Floating pill header over the hero / dark stage. Navigation happens inside the page flow. */
export function TopNav({ demo }: { demo: boolean }) {
  const pathname = usePathname();
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4">
      <div className="pointer-events-auto flex w-full max-w-[1240px] items-center gap-4 rounded-full border border-white/15 bg-night/90 px-4 py-2 text-white shadow-lg backdrop-blur-md sm:px-5">
        <Link href="/" aria-label="Benchmark Hospital – back to the start"
          onClick={(e) => {
            // Already on the single page: tell the flow to go back to the start screen instead of reloading
            if (pathname === "/") { e.preventDefault(); window.dispatchEvent(new Event("app:home")); }
          }}
          className="flex items-center gap-2.5 text-sm font-semibold tracking-wide focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-white/40">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          Benchmark Hospital
        </Link>
        {demo && <span className="ml-auto rounded-full border border-white/25 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-white/80">Prototype · illustrative data</span>}
      </div>
    </header>
  );
}
