"use client";
import Link from "next/link";

/** Slim header: logo and prototype badge only. Navigation happens inside the page flow. */
export function TopNav({ demo }: { demo: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          Benchmark Hospital
        </Link>
        {demo && <span className="ml-auto rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">Prototype · illustrative data</span>}
      </div>
    </header>
  );
}
