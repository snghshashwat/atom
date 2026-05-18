import { requireRole } from "@/lib/auth";
import BarChart from "@/components/charts/BarChart";
import Donut from "@/components/charts/Donut";
import Heatmap from "@/components/charts/Heatmap";
import { getActiveCycle } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import { overallAchievement, scoreFor } from "@/lib/scoring";
import type { Quarter } from "@/lib/types";

const QS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

const DONUT_COLORS = ["#1f4ed8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

export default async function AnalyticsPage() {
  await requireRole("manager", "admin");
  const cycle = getActiveCycle();
  const db = getDB();
  const goals = db.goals.filter((g) => g.cycleId === cycle.id);
  const employees = db.users.filter((u) => u.role === "employee");

  // QoQ avg achievement across whole org
  const qoq = QS.map((q) => {
    const perEmp = employees.map((e) => {
      const sheet = goals.filter((g) => g.ownerId === e.id && (g.state === "approved" || g.state === "unlocked"));
      return overallAchievement(sheet, q);
    }).filter((v): v is number => v != null);
    const avg = perEmp.length === 0 ? 0 : perEmp.reduce((s, v) => s + v, 0) / perEmp.length;
    return { label: q, value: Math.round(avg * 10) / 10, sub: `${perEmp.length} reporting` };
  });

  // Distribution by Thrust Area (counts)
  const distTA = db.thrustAreas.map((t, i) => ({
    label: t.name, value: goals.filter((g) => g.thrustAreaId === t.id).length, color: DONUT_COLORS[i % DONUT_COLORS.length],
  })).filter((d) => d.value > 0);

  // Distribution by UoM
  const distUoM = (["min", "max", "timeline", "zero"] as const).map((u, i) => ({
    label: u === "min" ? "Higher better" : u === "max" ? "Lower better" : u === "timeline" ? "Timeline" : "Zero-based",
    value: goals.filter((g) => g.uom === u).length,
    color: DONUT_COLORS[i],
  })).filter((d) => d.value > 0);

  // Distribution by status (active quarter or aggregate)
  const distStatus = (["not_started", "on_track", "completed"] as const).map((s, i) => ({
    label: s === "not_started" ? "Not started" : s === "on_track" ? "On track" : "Completed",
    value: goals.reduce((n, g) => n + QS.filter((q) => g.checkins[q]?.status === s).length, 0),
    color: i === 0 ? "#94a3b8" : i === 1 ? "#0ea5e9" : "#10b981",
  })).filter((d) => d.value > 0);

  // Heatmap: employees × quarters (overall achievement)
  const heatmap = {
    columns: QS as string[],
    rows: employees.map((e) => {
      const sheet = goals.filter((g) => g.ownerId === e.id && (g.state === "approved" || g.state === "unlocked"));
      return {
        label: `${e.name}`,
        cells: QS.map((q) => ({ key: q, value: overallAchievement(sheet, q) })),
      };
    }),
  };

  // Manager effectiveness: % of (employee × quarter) cells with a manager comment for that manager's team
  const managers = db.users.filter((u) => u.role === "manager");
  const mgrEffectiveness = managers.map((m) => {
    const reports = employees.filter((u) => u.managerId === m.id);
    let total = 0; let withComment = 0;
    for (const r of reports) {
      const sheet = goals.filter((g) => g.ownerId === r.id && (g.state === "approved" || g.state === "unlocked"));
      for (const g of sheet) {
        for (const q of QS) {
          total++;
          if (g.checkins[q]?.managerComment) withComment++;
        }
      }
    }
    return { label: m.name, value: total === 0 ? 0 : Math.round((withComment / total) * 100), sub: `${reports.length} reports` };
  });

  // Average score per thrust area (across all quarters)
  const taPerf = db.thrustAreas.map((t) => {
    const inta = goals.filter((g) => g.thrustAreaId === t.id);
    const scores = inta.flatMap((g) => QS.map((q) => scoreFor(g, q)).filter((s): s is number => s != null));
    return { label: t.name, value: scores.length === 0 ? 0 : Math.round(scores.reduce((s, v) => s + v, 0) / scores.length), sub: `${inta.length} goals` };
  }).filter((d) => d.value > 0);

  // Department-level achievement breakdown
  const departments = [...new Set(employees.map((e) => e.department))];
  const deptAchievement = departments.map((dept) => {
    const deptEmps = employees.filter((e) => e.department === dept);
    const deptScores = deptEmps.map((e) => {
      const sheet = goals.filter((g) => g.ownerId === e.id && (g.state === "approved" || g.state === "unlocked"));
      const scores = QS.map((q) => overallAchievement(sheet, q)).filter((v): v is number => v != null);
      return scores.length === 0 ? null : scores.reduce((s, v) => s + v, 0) / scores.length;
    }).filter((v): v is number => v != null);
    const avg = deptScores.length === 0 ? 0 : Math.round(deptScores.reduce((s, v) => s + v, 0) / deptScores.length);
    return { label: dept, value: avg, sub: `${deptEmps.length} employees` };
  });

  // Team-level QoQ (per manager)
  const teamQoQ = managers.map((m) => {
    const reports = employees.filter((u) => u.managerId === m.id);
    const qData = QS.map((q) => {
      const perEmp = reports.map((e) => {
        const sheet = goals.filter((g) => g.ownerId === e.id && (g.state === "approved" || g.state === "unlocked"));
        return overallAchievement(sheet, q);
      }).filter((v): v is number => v != null);
      return perEmp.length === 0 ? 0 : Math.round(perEmp.reduce((s, v) => s + v, 0) / perEmp.length);
    });
    return { manager: m.name, reports: reports.length, qData };
  });

  // Goal state distribution
  const stateDistrib = (["draft", "submitted", "returned", "approved", "unlocked"] as const).map((s, i) => ({
    label: s === "draft" ? "Draft" : s === "submitted" ? "Submitted" : s === "returned" ? "Returned" : s === "approved" ? "Approved" : "Unlocked",
    value: goals.filter((g) => g.state === s).length,
    color: [DONUT_COLORS[0], DONUT_COLORS[1], DONUT_COLORS[2], DONUT_COLORS[3], DONUT_COLORS[4]][i],
  })).filter((d) => d.value > 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">{cycle.name} · Quarter-on-quarter trends, distributions, heatmaps, department breakdowns, and manager effectiveness.</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="stat-label">Total goals</div>
          <div className="stat-value">{goals.length}</div>
          <div className="stat-trend">Across {employees.length} employees</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Approved &amp; locked</div>
          <div className="stat-value">{goals.filter((g) => g.state === "approved" || g.state === "unlocked").length}</div>
          <div className="stat-trend">{goals.length > 0 ? Math.round((goals.filter((g) => g.state === "approved" || g.state === "unlocked").length / goals.length) * 100) : 0}% of all goals</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Departments</div>
          <div className="stat-value">{departments.length}</div>
          <div className="stat-trend">{managers.length} L1 managers</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Thrust areas</div>
          <div className="stat-value">{db.thrustAreas.length}</div>
          <div className="stat-trend">{distTA.length} in use</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">QoQ overall achievement (org average)</div></div>
          <div className="card-body">
            <BarChart data={qoq} max={100} format={(n) => `${n}%`} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Goals by status</div></div>
          <div className="card-body">
            {distStatus.length > 0 ? <Donut data={distStatus} centerLabel="Status entries" centerValue={String(distStatus.reduce((s, d) => s + d.value, 0))} /> : <div className="empty">No status data yet.</div>}
          </div>
        </div>
      </div>

      {/* Department achievement */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Department achievement</div>
              <div className="card-subtitle">Average weighted achievement across all quarters per department.</div>
            </div>
          </div>
          <div className="card-body">
            {deptAchievement.length > 0 ? <BarChart data={deptAchievement} max={100} format={(n) => `${n}%`} color="#06b6d4" /> : <div className="empty">No data yet.</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Goal state pipeline</div></div>
          <div className="card-body">
            {stateDistrib.length > 0 ? <Donut data={stateDistrib} centerLabel="Total goals" centerValue={String(goals.length)} /> : <div className="empty">No goals yet.</div>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Goals by Thrust Area</div></div>
          <div className="card-body">{distTA.length > 0 ? <Donut data={distTA} centerLabel="Total goals" centerValue={String(distTA.reduce((s, d) => s + d.value, 0))} /> : <div className="empty">No goals yet.</div>}</div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Goals by UoM</div></div>
          <div className="card-body">{distUoM.length > 0 ? <Donut data={distUoM} centerLabel="Total goals" centerValue={String(distUoM.reduce((s, d) => s + d.value, 0))} /> : <div className="empty">No goals yet.</div>}</div>
        </div>
      </div>

      {/* Team-level QoQ table */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Team-level QoQ achievement</div>
            <div className="card-subtitle">Average weighted achievement per manager&apos;s team, broken down by quarter.</div>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Manager</th>
              <th>Team size</th>
              {QS.map((q) => <th key={q}>{q}</th>)}
              <th>Avg</th>
            </tr>
          </thead>
          <tbody>
            {teamQoQ.map((t) => {
              const nonZero = t.qData.filter((v) => v > 0);
              const avg = nonZero.length === 0 ? 0 : Math.round(nonZero.reduce((s, v) => s + v, 0) / nonZero.length);
              return (
                <tr key={t.manager}>
                  <td style={{ fontWeight: 600 }}>{t.manager}</td>
                  <td>{t.reports} reports</td>
                  {t.qData.map((v, i) => (
                    <td key={QS[i]}>
                      {v > 0 ? (
                        <div>
                          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{v}%</span>
                          <div className="progress" style={{ marginTop: 4, maxWidth: 100 }}><div style={{ width: `${v}%` }} /></div>
                        </div>
                      ) : <span className="muted">—</span>}
                    </td>
                  ))}
                  <td>
                    <span style={{ fontWeight: 700, color: avg >= 80 ? "var(--success)" : avg >= 50 ? "var(--warning)" : "var(--text-muted)" }}>{avg > 0 ? `${avg}%` : "—"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Manager effectiveness</div>
            <div className="card-subtitle">% of check-in cells (employee × quarter) where the manager has logged a comment.</div>
          </div>
        </div>
        <div className="card-body">
          {mgrEffectiveness.length > 0 ? <BarChart data={mgrEffectiveness} max={100} format={(n) => `${n}%`} color="#8b5cf6" /> : <div className="empty">No managers configured.</div>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header"><div className="card-title">Achievement heatmap — Employees × Quarter</div></div>
        <div className="card-body" style={{ overflowX: "auto" }}>
          {heatmap.rows.length > 0 ? <Heatmap columns={heatmap.columns} rows={heatmap.rows} /> : <div className="empty">No employees yet.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Avg score by Thrust Area</div></div>
        <div className="card-body">
          {taPerf.length > 0 ? <BarChart data={taPerf} max={100} format={(n) => `${n}%`} color="#10b981" /> : <div className="empty">No measurable data yet.</div>}
        </div>
      </div>
    </>
  );
}
