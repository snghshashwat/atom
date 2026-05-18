interface Slice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: Slice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

export default function Donut({ data, size = 180, centerLabel, centerValue }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  // Pre-compute the rotation offset for each slice so the render path stays pure.
  const rotations: number[] = [];
  let running = 0;
  for (const d of data) {
    rotations.push((running / total) * 360 - 90);
    running += d.value;
  }
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--border)" strokeWidth={18} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = frac * 2 * Math.PI * radius;
          const dasharray = `${len} ${2 * Math.PI * radius - len}`;
          const rotation = rotations[i];
          return (
            <circle
              key={d.label}
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={18}
              strokeDasharray={dasharray}
              transform={`rotate(${rotation} ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          );
        })}
        {centerValue ? (
          <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 20, fontWeight: 700, fill: "var(--text)" }}>{centerValue}</text>
        ) : null}
        {centerLabel ? (
          <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 10, fill: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>{centerLabel}</text>
        ) : null}
      </svg>
      <div style={{ display: "grid", gap: 6 }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 12, height: 12, background: d.color, borderRadius: 3 }} />
            <span style={{ fontWeight: 600 }}>{d.label}</span>
            <span className="muted">{Math.round((d.value / total) * 100)}% ({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
