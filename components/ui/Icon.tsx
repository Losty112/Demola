/**
 * Small line icons (24×24, stroke = currentColor). Used instead of raw numbers where a picture reads faster,
 * e.g. one bed icon per free bed.
 */
const PATHS = {
  bed: "M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-.01",
  doctor: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21v-1a7 7 0 0 1 14 0v1M15 15v3M13.5 16.5h3",
  nurse: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21v-1a7 7 0 0 1 14 0v1M8.5 5.5h7",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21v-1a7 7 0 0 1 14 0v1",
  ambulance: "M3 17V7h11v10M14 10h4l3 3v4h-7M7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8.5 9.5v4M6.5 11.5h4",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  flame: "M12 22c4 0 7-2.7 7-6.8 0-3.7-2.6-6.5-4.2-8.2-.3 2-1.3 3.4-2.8 4.1C12.4 7.5 10.6 4.5 8.5 2.5 8.6 6 5 8.6 5 13.6 5 18.8 8 22 12 22Z",
  drop: "M12 2.7S5 10.2 5 14.5a7 7 0 0 0 14 0C19 10.2 12 2.7 12 2.7Z",
  euro: "M18 6.5A7 7 0 1 0 18 17.5M4 10h9M4 14h9",
  building: "M4 21V5l8-3 8 3v16M4 21h16M9 21v-4h6v4M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2",
  pill: "m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7ZM8.5 8.5l7 7",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  check: "M20 6 9 17l-5-5",
  upload: "M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4",
  download: "M12 3v12M7 10l5 5 5-5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4",
  chart: "M3 3v18h18M7 15l4-4 3 3 6-6",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14",
  hospital: "M12 6v4M10 8h4M5 21V4h14v17M3 21h18M10 21v-4h4v4",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  flask: "M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21.5h11.6a2 2 0 0 0 1.7-3L14 9V3",
  layers: "m12 2 10 5-10 5L2 7l10-5ZM2 12l10 5 10-5M2 17l10 5 10-5",
  compare: "M8 3v18M16 3v18M3 8h5M16 16h5M3 16h5M16 8h5",
  cone: "M9.5 4h5l4 15h-13l4-15ZM3 20h18M8 12h8",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-5 w-5", title }: { name: IconName; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d={PATHS[name]} />
    </svg>
  );
}

/**
 * A count shown as icons: one icon per unit up to `max`, then "+N". Screen readers get the number.
 * `empty` icons are drawn faded (e.g. open posts, occupied beds).
 */
export function IconCount({ name, count, max = 24, className = "text-par", label, iconClass = "h-4 w-4", empty = 0, emptyClass = "text-white/25" }: {
  name: IconName; count: number; max?: number; className?: string; label: string; iconClass?: string; empty?: number; emptyClass?: string;
}) {
  const n = Math.max(0, Math.round(count));
  const e = Math.max(0, Math.round(empty));
  const shown = Math.min(n, max);
  const shownEmpty = Math.min(e, Math.max(0, max - shown));
  const rest = n + e - shown - shownEmpty;
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5" role="img" aria-label={label} title={label}>
      {Array.from({ length: shown }, (_, i) => <span key={`f${i}`} className={className}><Icon name={name} className={iconClass} /></span>)}
      {Array.from({ length: shownEmpty }, (_, i) => <span key={`e${i}`} className={emptyClass}><Icon name={name} className={iconClass} /></span>)}
      {rest > 0 && <span className="ml-1 text-xs font-semibold text-muted">+{rest}</span>}
      {n + e === 0 && <span className="text-xs text-muted">none</span>}
    </span>
  );
}
