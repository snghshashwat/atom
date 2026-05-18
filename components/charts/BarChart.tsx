interface Datum {
  label: string;
  value: number;          // 0..100 or any value; we render relative
  sub?: string;
}

interface Props {
  data: Datum[];
  max?: number;
  format?: (n: number) => string;
  height?: number;
  color?: string;
}

export default function BarChart({ data, max, format = (n) => String(n), height = 220, color = "var(--primary)" }: Props) {
  const ceiling = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, data.length)}, 1fr)`, gap: 8, alignItems: "end", height, paddingBottom: 32, position: "relative" }}>
      {data.map((d) => {
        const h = (d.value / ceiling) * (height - 48);
        return (
          <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" }}>{format(d.value)}</div>
            <div style={{ width: "100%", maxWidth: 56, height: Math.max(4, h), background: color, borderRadius: "6px 6px 0 0" }} />
            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
              <div style={{ fontWeight: 600, color: "var(--text)" }}>{d.label}</div>
              {d.sub ? <div>{d.sub}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
