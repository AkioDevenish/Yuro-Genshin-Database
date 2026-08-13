type Point = { day: string; inbound: number; outbound: number };

/**
 * Pure-SVG grouped bar chart — no charting dependency, renders on the server.
 */
export function TrendChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-white/35">
        No stock movements recorded yet.
      </div>
    );
  }

  const max = Math.max(1, ...data.flatMap((d) => [d.inbound, d.outbound]));
  const height = 160;
  const slot = 100 / data.length;
  const barWidth = Math.min(slot * 0.3, 3.2);

  return (
    <div>
      <div className="flex items-center gap-4 px-1 pb-3 text-xs text-white/45">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-400" /> Received
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gold-400" /> Issued
        </span>
        <span className="ml-auto">Peak {max}</span>
      </div>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="h-[160px] w-full"
        role="img"
        aria-label="Daily stock received and issued"
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1="0"
            x2="100"
            y1={height - height * f}
            y2={height - height * f}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {data.map((d, i) => {
          const centre = slot * i + slot / 2;
          const inH = (d.inbound / max) * (height - 12);
          const outH = (d.outbound / max) * (height - 12);
          return (
            <g key={d.day}>
              <rect
                x={centre - barWidth - 0.35}
                y={height - inH}
                width={barWidth}
                height={inH}
                rx="0.8"
                fill="#34d399"
              />
              <rect
                x={centre + 0.35}
                y={height - outH}
                width={barWidth}
                height={outH}
                rx="0.8"
                fill="#e9b949"
              />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between px-1 pt-2 text-[10px] text-white/30">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}
