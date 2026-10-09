export function Footer({ demo }: { demo: boolean }) {
  return (
    <footer className="border-t border-line bg-white/60 py-6 text-center text-xs text-muted">
      {demo
        ? "Prototype with illustrative demo data. Benchmark values and decision rules are placeholders to be agreed with stakeholders."
        : "Benchmark values and decision rules are to be agreed with stakeholders."}
    </footer>
  );
}
