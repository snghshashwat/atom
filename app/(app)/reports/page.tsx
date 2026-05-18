import { requireRole } from "@/lib/auth";
import { getActiveCycle } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import { scoreFor } from "@/lib/scoring";
import type { Quarter } from "@/lib/types";
import Icon from "@/components/Icon";

const QS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export default async function ReportsPage() {
  await requireRole("manager", "admin");
  const cycle = getActiveCycle();
  const db = getDB();
  const goals = db.goals.filter((g) => g.cycleId === cycle.id);
  const employees = db.users.filter((u) => u.role === "employee");

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Achievement report</h1>
          <p className="page-subtitle">{cycle.name} · Planned target vs. actual achievement for every employee. Export to CSV (opens in Excel).</p>
        </div>
        <div className="toolbar">
          <a href="/api/reports/achievement" className="btn btn-primary"><Icon name="download" /> Download CSV</a>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Goal</th>
              <th>Target</th>
              {QS.map((q) => (
                <th key={q}>{q} actual / score</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.flatMap((emp) => {
              const sheet = goals.filter((g) => g.ownerId === emp.id);
              if (sheet.length === 0) {
                return [(
                  <tr key={emp.id}>
                    <td><strong>{emp.name}</strong></td>
                    <td colSpan={6} className="muted">No goals on sheet.</td>
                  </tr>
                )];
              }
              return sheet.map((g, i) => (
                <tr key={g.id}>
                  {i === 0 ? (
                    <td rowSpan={sheet.length} style={{ verticalAlign: "top", borderRight: "1px solid var(--border)" }}>
                      <strong>{emp.name}</strong>
                      <div className="muted">{emp.department}</div>
                    </td>
                  ) : null}
                  <td><strong>{g.title}</strong><div className="muted">{g.weightage}% · {g.uom}</div></td>
                  <td><code style={{ fontSize: 12 }}>{g.target}</code></td>
                  {QS.map((q) => {
                    const c = g.checkins[q];
                    const score = scoreFor(g, q);
                    return (
                      <td key={q} style={{ minWidth: 130 }}>
                        {c?.actual ? (
                          <>
                            <div style={{ fontSize: 13 }}><code style={{ fontSize: 12 }}>{c.actual}</code></div>
                            {score != null ? (
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                {score}% · {c.status ?? "—"}
                              </div>
                            ) : null}
                          </>
                        ) : <span className="muted">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
