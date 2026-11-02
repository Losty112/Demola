export function Footer({ demo }: { demo: boolean }) {
  return (
    <footer className="border-t border-white/10 bg-night py-6 text-center text-xs text-white/55">
      {demo
        ? "Prototype with illustrative demo data. Benchmark values and decision rules are placeholders to be agreed with stakeholders."
        : "Benchmark values and decision rules are to be agreed with stakeholders."}
    </footer>
  );
}
