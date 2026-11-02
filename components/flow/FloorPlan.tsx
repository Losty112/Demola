/** Simple hospital floor-plan line drawing (decorative). Strokes use currentColor so it works on light and dark panels. */
export function FloorPlan({ className = "" }: { className?: string }) {
  const rooms: [number, number, number, number][] = [
    // top wing: patient rooms
    [20, 20, 40, 34], [60, 20, 40, 34], [100, 20, 40, 34], [140, 20, 40, 34], [180, 20, 40, 34], [220, 20, 40, 34],
    // bottom wing
    [20, 126, 52, 34], [72, 126, 52, 34], [124, 126, 40, 34], [164, 126, 48, 34], [212, 126, 48, 34],
  ];
  return (
    <svg viewBox="0 0 280 180" className={className} fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" role="img" aria-label="Hospital floor plan drawing">
      <rect x="10" y="10" width="260" height="160" strokeWidth="2" />
      {rooms.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} />)}
      {/* corridors */}
      <path d="M20 54 H260 M20 126 H260" strokeDasharray="3 3" opacity=".6" />
      {/* central atrium + core */}
      <rect x="100" y="66" width="80" height="48" />
      <circle cx="140" cy="90" r="14" />
      <path d="M140 76 V104 M126 90 H154" opacity=".6" />
      {/* stairs and lifts */}
      <g opacity=".8"><rect x="20" y="66" width="28" height="48" />{[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M20 ${72 + i * 8} H48`} />)}</g>
      <rect x="232" y="66" width="28" height="22" /><rect x="232" y="92" width="28" height="22" /><path d="M232 66 L260 88 M260 66 L232 88" opacity=".6" />
      {/* doors */}
      {[40, 80, 120, 160, 200, 240].map((x) => <path key={x} d={`M${x - 6} 54 A6 6 0 0 1 ${x} 48`} opacity=".7" />)}
      {/* main entrance */}
      <path d="M118 170 V162 H162 V170" strokeWidth="2" /><path d="M128 162 A12 12 0 0 1 140 150 M152 162 A12 12 0 0 0 140 150" opacity=".7" />
    </svg>
  );
}
