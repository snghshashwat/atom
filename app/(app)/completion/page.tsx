import { requireRole } from "@/lib/auth";
import { getActiveCycle, quarterState } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import type { Quarter } from "@/lib/types";

const QS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export default async function CompletionPage() {
  await requireRole("manager", "admin");
  const cycle = getActiveCycle();
  const db = getDB();
  const employees = db.users.filter((u) => u.role === "employee");
  const managers = db.users.filter((u) => u.role === "manager");
  const goalsByEmp = new Map<string, typeof db.goals>();
  for (const e of employees) goalsByEmp.set(e.id, db.goals.filter((g) => g.ownerId === e.id && g.cycleId === cycle.id && (g.state === "approved" || g.state === "unlocked")));

  // Has the employee logged something for q?
  const empDoneQ = (empId: string, q: Quarter) => {
    const goals = goalsByEmp.get(empId) ?? [];
    if (goals.length === 0) return false;
    return goals.every((g) => g.checkins[q]?.actual || g.checkins[q]?.status);
  };
  // Has the manager left at least one comment in q for any direct report?
  const mgrDoneQ = (mgrId: string, q: Quarter) => {
    const reports = employees.filter((u) => u.managerId === mgrId);
    if (reports.length === 0) return false;
    return reports.every((emp) => {
      const goals = goalsByEmp.get(emp.id) ?? [];
      if (goals.length === 0) return true; // nothing to comment on
      return goals.some((g) => g.checkins[q]?.managerComment);
    });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Completion dashboard</h1>
          <p className="page-subtitle">{cycle.name} · Real-time view of which employees and managers have completed each quarterly check-in.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><div className="card-title">Employee check-ins</div></div>
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Manager</th>
              {QS.map((q) => <th key={q} style={{ textAlign: "center" }}>{q} <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{quarterState(cycle, q)}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const mgr = db.users.find((u) => u.id === e.managerId);
              return (
                <tr key={e.id}>
                  <td><strong>{e.name}</strong><div className="muted">{e.department}</div></td>
                  <td>{mgr?.name ?? <span className="muted">—</span>}</td>
                  {QS.map((q) => {
                    const done = empDoneQ(e.id, q);
                    const wState = quarterState(cycle, q);
                    return (
                      <td key={q} style={{ textAlign: "center" }}>
                        {wState === "not_open" ? <span className="muted">—</span> :
                          done ? <span className="badge badge-success">Done</span> : <span className="badge badge-warning">Pending</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Manager check-ins (comments logged across team)</div></div>
        <table className="table">
          <thead>
            <tr>
              <th>Manager</th>
              <th>Direct reports</th>
              {QS.map((q) => <th key={q} style={{ textAlign: "center" }}>{q}</th>)}
            </tr>
          </thead>
          <tbody>
            {managers.map((m) => {
              const reports = employees.filter((e) => e.managerId === m.id);
              return (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong><div className="muted">{m.department}</div></td>
                  <td>{reports.length}</td>
                  {QS.map((q) => {
                    const done = mgrDoneQ(m.id, q);
                    const wState = quarterState(cycle, q);
                    return (
                      <td key={q} style={{ textAlign: "center" }}>
                        {wState === "not_open" ? <span className="muted">—</span> :
                          done ? <span className="badge badge-success">Done</span> : <span className="badge badge-warning">Pending</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
