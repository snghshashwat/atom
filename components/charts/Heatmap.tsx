interface Row {
  label: string;
  cells: Array<{ key: string; value: number | null; tooltip?: string }>;
}

interface Props {
  columns: string[];
  rows: Row[];
}

function color(v: number | null): string {
  if (v == null) return "#e2e8f0";
  // 0 → red, 100 → green
  const r = Math.round(220 + (4 - 220) * (v / 100));
  const g = Math.round(53 + (160 - 53) * (v / 100));
  const b = Math.round(69 + (84 - 69) * (v / 100));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Heatmap({ columns, rows }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${columns.length}, minmax(70px, 1fr))`, gap: 4, alignItems: "center" }}>
      <div />
      {columns.map((c) => (
        <div key={c} style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{c}</div>
      ))}
      {rows.flatMap((r) => [
        <div key={`${r.label}-label`} style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>,
        ...r.cells.map((c) => (
          <div
            key={`${r.label}-${c.key}`}
            title={c.tooltip ?? (c.value != null ? `${c.value}%` : "no data")}
            style={{
              background: color(c.value), color: c.value != null && c.value < 50 ? "white" : "var(--text)",
              fontSize: 12, fontWeight: 700, textAlign: "center", padding: "12px 0", borderRadius: 4,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.value != null ? `${Math.round(c.value)}` : "—"}
          </div>
        )),
      ])}
    </div>
  );
}
