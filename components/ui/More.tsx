/** Collapsed block: details stay out of the way until the reader asks for them. */
export function More({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-line bg-surface shadow-card backdrop-blur-md">
      <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-brand-600 group-open:border-b group-open:border-line">{summary}</summary>
      <div className="p-5">{children}</div>
    </details>
  );
}
