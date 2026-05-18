import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { activeQuarter, formatDate, getActiveCycle, goalSettingState } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import { overallAchievement } from "@/lib/scoring";
import { validateSheet } from "@/lib/validation";
import Icon from "@/components/Icon";
import { StateBadge, StatusBadge } from "@/components/StatusBadge";

export default async function DashboardPage() {
  const user = await requireUser();
  const db = getDB();
  const cycle = getActiveCycle();
  const settingState = goalSettingState(cycle);
  const aq = activeQuarter(cycle);

  const myGoals = db.goals.filter((g) => g.ownerId === user.id && g.cycleId === cycle.id);
  const v = validateSheet(myGoals);
  const myOverall = aq ? overallAchievement(myGoals, aq) : null;

  // Manager metrics
  const directReports = db.users.filter((u) => u.managerId === user.id);
  const reportIds = new Set(directReports.map((u) => u.id));
  const reportGoals = db.goals.filter((g) => reportIds.has(g.ownerId) && g.cycleId === cycle.id);
  const pendingApprovals = directReports.filter((u) =>
    reportGoals.some((g) => g.ownerId === u.id && g.state === "submitted"),
  );
  const completedThisQuarter = aq
    ? directReports.filter((u) => {
        const sheet = reportGoals.filter((g) => g.ownerId === u.id && (g.state === "approved" || g.state === "unlocked"));
        if (sheet.length === 0) return false;
        return sheet.every((g) => g.checkins[aq]?.actual || g.checkins[aq]?.status);
      }).length
    : 0;

  // Admin metrics
  const allEmployees = db.users.filter((u) => u.role === "employee");
  const orgSubmittedSheets = allEmployees.filter((e) => reportGoalsHasState(db.goals, e.id, cycle.id, ["submitted", "approved", "unlocked"])).length;
  const orgApprovedSheets = allEmployees.filter((e) => reportGoalsHasState(db.goals, e.id, cycle.id, ["approved", "unlocked"])).length;
  const completionByQ = aq
    ? allEmployees.filter((e) => {
        const sheet = db.goals.filter((g) => g.ownerId === e.id && g.cycleId === cycle.id && (g.state === "approved" || g.state === "unlocked"));
        return sheet.length > 0 && sheet.every((g) => g.checkins[aq]?.actual || g.checkins[aq]?.status);
      }).length
    : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="page-subtitle">
            {cycle.name} · {settingState === "open" ? "Goal setting is open" : aq ? `${aq} check-in window is open` : "Cycle closed"}
          </p>
        </div>
        <div className="toolbar">
          {user.role === "employee" ? (
            <Link href="/goals" className="btn btn-primary"><Icon name="target" /> Open my goal sheet</Link>
          ) : null}
          {user.role === "manager" ? (
            <>
              <Link href="/approvals" className="btn btn-primary"><Icon name="shield" /> Review approvals ({pendingApprovals.length})</Link>
              <Link href="/team" className="btn btn-secondary"><Icon name="team" /> Team check-ins</Link>
            </>
          ) : null}
          {user.role === "admin" ? (
            <>
              <Link href="/reports" className="btn btn-primary"><Icon name="download" /> Reports</Link>
              <Link href="/admin/cycles" className="btn btn-secondary"><Icon name="calendar" /> Manage cycle</Link>
            </>
          ) : null}
        </div>
      </div>

      {/* Cycle calendar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {[
            { name: "Goal Setting", date: cycle.goalSettingOpens, active: settingState === "open" },
            { name: "Q1 Check-in", date: cycle.q1Opens, active: aq === "Q1" },
            { name: "Q2 Check-in", date: cycle.q2Opens, active: aq === "Q2" },
            { name: "Q3 Check-in", date: cycle.q3Opens, active: aq === "Q3" },
            { name: "Q4 / Annual", date: cycle.q4Opens, active: aq === "Q4" },
          ].map((p) => (
            <div key={p.name} style={{
              padding: 12, border: "1px solid var(--border)", borderRadius: 8,
              background: p.active ? "var(--primary-soft)" : "var(--panel-2)",
              borderColor: p.active ? "#c7d4ff" : "var(--border)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: p.active ? "var(--primary)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{p.name}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{formatDate(p.date)}</div>
              {p.active ? <div style={{ fontSize: 11, color: "var(--primary)", marginTop: 2 }}>● Open now</div> : null}
            </div>
          ))}
        </div>
      </div>

      {user.role === "employee" ? (
        <EmployeeDashboard user={user} myGoals={myGoals} v={v} aq={aq} myOverall={myOverall} thrustAreas={db.thrustAreas} />
      ) : user.role === "manager" ? (
        <ManagerDashboard
          directReports={directReports}
          pendingApprovals={pendingApprovals}
          completedThisQuarter={completedThisQuarter}
          reportGoals={reportGoals}
          activeQ={aq}
        />
      ) : (
        <AdminDashboard
          totalEmployees={allEmployees.length}
          submitted={orgSubmittedSheets}
          approved={orgApprovedSheets}
          completionByQ={completionByQ}
          activeQ={aq}
        />
      )}
    </>
  );
}

function reportGoalsHasState(goals: import("@/lib/types").Goal[], ownerId: string, cycleId: string, states: string[]): boolean {
  return goals.some((g) => g.ownerId === ownerId && g.cycleId === cycleId && states.includes(g.state));
}

function EmployeeDashboard({ user, myGoals, v, aq, myOverall, thrustAreas }: {
  user: import("@/lib/types").User;
  myGoals: import("@/lib/types").Goal[];
  v: ReturnType<typeof validateSheet>;
  aq: import("@/lib/types").Quarter | null;
  myOverall: number | null;
  thrustAreas: import("@/lib/types").ThrustArea[];
}) {
  void user;
  const taName = (id: string) => thrustAreas.find((t) => t.id === id)?.name ?? id;
  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="stat-label">Goals on sheet</div>
          <div className="stat-value">{v.count} / 8</div>
          <div className="stat-trend">Weightage {v.totalWeightage}% of 100%</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Sheet status</div>
          <div className="stat-value" style={{ fontSize: 16, paddingTop: 8 }}>
            {myGoals.length === 0 ? "Empty" :
              myGoals.every((g) => g.state === "approved") ? "Locked" :
              myGoals.some((g) => g.state === "submitted") ? "Awaiting approval" :
              myGoals.some((g) => g.state === "returned") ? "Returned — rework" :
              "Draft"}
          </div>
          <div className="stat-trend">{v.ok ? "Ready to submit" : v.blockers[0] ?? ""}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">{aq ? `${aq} achievement` : "Achievement"}</div>
          <div className="stat-value">{myOverall != null ? `${myOverall}%` : "—"}</div>
          <div className="stat-trend">{aq ? "Weighted across approved goals" : "No active check-in window"}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Direct manager</div>
          <div className="stat-value" style={{ fontSize: 16, paddingTop: 8 }}>{user.managerId ? (getDB().users.find((u) => u.id === user.managerId)?.name ?? "—") : "—"}</div>
          <div className="stat-trend">{user.department}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">My goals — quick view</div>
            <div className="card-subtitle">Open the goal sheet to add, edit, submit, or log check-ins.</div>
          </div>
          <Link href="/goals" className="btn btn-secondary btn-sm">Open sheet <Icon name="chevron-right" /></Link>
        </div>
        {myGoals.length === 0 ? (
          <div className="card-body">
            <div className="empty">
              <div style={{ fontSize: 24, marginBottom: 6 }}>🎯</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>You haven&apos;t added any goals yet.</div>
              <div style={{ marginTop: 4 }}>Define between 1 and 8 goals totalling 100% weightage, each at least 10%.</div>
              <Link href="/goals" className="btn btn-primary" style={{ marginTop: 12 }}><Icon name="plus" /> Add your first goal</Link>
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Thrust area</th>
                <th>Weightage</th>
                <th>State</th>
                {aq ? <th>{aq} status</th> : null}
              </tr>
            </thead>
            <tbody>
              {myGoals.map((g) => (
                <tr key={g.id}>
                  <td style={{ fontWeight: 600 }}>{g.title}</td>
                  <td>{taName(g.thrustAreaId)}</td>
                  <td>{g.weightage}%</td>
                  <td><StateBadge state={g.state} /></td>
                  {aq ? <td><StatusBadge status={g.checkins[aq]?.status} /></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function ManagerDashboard({ directReports, pendingApprovals, completedThisQuarter, reportGoals, activeQ }: {
  directReports: import("@/lib/types").User[];
  pendingApprovals: import("@/lib/types").User[];
  completedThisQuarter: number;
  reportGoals: import("@/lib/types").Goal[];
  activeQ: import("@/lib/types").Quarter | null;
}) {
  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="stat-label">Direct reports</div>
          <div className="stat-value">{directReports.length}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Pending approvals</div>
          <div className="stat-value">{pendingApprovals.length}</div>
          <div className="stat-trend">{pendingApprovals.length > 0 ? "Action required" : "All caught up"}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">{activeQ ? `${activeQ} check-ins completed` : "Check-ins completed"}</div>
          <div className="stat-value">{completedThisQuarter} / {directReports.length}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Approved goals on team</div>
          <div className="stat-value">{reportGoals.filter((g) => g.state === "approved" || g.state === "unlocked").length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Team overview</div>
          <Link href="/team" className="btn btn-secondary btn-sm">Open team page <Icon name="chevron-right" /></Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Goals</th>
              <th>Sheet status</th>
              {activeQ ? <th>{activeQ} progress</th> : null}
            </tr>
          </thead>
          <tbody>
            {directReports.map((r) => {
              const sheet = reportGoals.filter((g) => g.ownerId === r.id);
              const approved = sheet.filter((g) => g.state === "approved" || g.state === "unlocked");
              const overall = activeQ ? overallAchievement(approved, activeQ) : null;
              const sheetState =
                sheet.length === 0 ? "No sheet" :
                sheet.some((g) => g.state === "submitted") ? "Awaiting approval" :
                sheet.some((g) => g.state === "returned") ? "Returned" :
                sheet.every((g) => g.state === "approved") ? "Locked" : "Mixed";
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.department}</td>
                  <td>{sheet.length}</td>
                  <td>{sheetState}</td>
                  {activeQ ? (
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="progress" style={{ flex: 1, maxWidth: 160 }}>
                          <div style={{ width: `${overall ?? 0}%` }} />
                        </div>
                        <span style={{ minWidth: 50, fontVariantNumeric: "tabular-nums" }}>{overall != null ? `${overall}%` : "—"}</span>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminDashboard({ totalEmployees, submitted, approved, completionByQ, activeQ }: {
  totalEmployees: number;
  submitted: number;
  approved: number;
  completionByQ: number;
  activeQ: import("@/lib/types").Quarter | null;
}) {
  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="stat-label">Total employees</div>
          <div className="stat-value">{totalEmployees}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Sheets submitted</div>
          <div className="stat-value">{submitted}</div>
          <div className="stat-trend">{Math.round((submitted / Math.max(1, totalEmployees)) * 100)}% of employees</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Approved &amp; locked</div>
          <div className="stat-value">{approved}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">{activeQ ? `${activeQ} check-ins completed` : "Check-ins completed"}</div>
          <div className="stat-value">{completionByQ} / {totalEmployees}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Admin quick links</div>
        </div>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <Link href="/admin/cycles" className="card" style={{ padding: 14, textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="calendar" size={20} /><strong>Manage cycle &amp; windows</strong></div>
            <div className="muted" style={{ marginTop: 6 }}>Set Goal Setting / Q1-Q4 dates, advance demo clock.</div>
          </Link>
          <Link href="/admin/users" className="card" style={{ padding: 14, textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="users" size={20} /><strong>Users &amp; hierarchy</strong></div>
            <div className="muted" style={{ marginTop: 6 }}>Add employees, edit reporting lines.</div>
          </Link>
          <Link href="/admin/audit" className="card" style={{ padding: 14, textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="history" size={20} /><strong>Audit trail</strong></div>
            <div className="muted" style={{ marginTop: 6 }}>Every change after lock, with actor &amp; timestamp.</div>
          </Link>
          <Link href="/admin/escalation" className="card" style={{ padding: 14, textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="alert" size={20} /><strong>Escalation rules</strong></div>
            <div className="muted" style={{ marginTop: 6 }}>Configure when escalations fire and to whom.</div>
          </Link>
          <Link href="/reports" className="card" style={{ padding: 14, textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="download" size={20} /><strong>Reports</strong></div>
            <div className="muted" style={{ marginTop: 6 }}>Export Achievement Report to CSV.</div>
          </Link>
          <Link href="/analytics" className="card" style={{ padding: 14, textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="bar-chart" size={20} /><strong>Analytics</strong></div>
            <div className="muted" style={{ marginTop: 6 }}>QoQ trends, heatmaps, distribution.</div>
          </Link>
          <Link href="/admin/sso" className="card" style={{ padding: 14, textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="key" size={20} /><strong>SSO / Azure AD</strong></div>
            <div className="muted" style={{ marginTop: 6 }}>Configure Microsoft Entra ID SSO, role mapping, hierarchy sync.</div>
          </Link>
        </div>
      </div>
    </>
  );
}
