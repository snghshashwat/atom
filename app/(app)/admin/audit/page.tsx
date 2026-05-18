import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import UnlockButton from "./UnlockButton";

const actionLabel: Record<string, string> = {
  goal_created: "Goal created",
  goal_updated: "Goal updated",
  goal_submitted: "Goal submitted",
  goal_returned: "Goal returned",
  goal_approved: "Goal approved",
  goal_unlocked: "Goal unlocked",
  goal_deleted: "Goal deleted",
  checkin_updated: "Check-in updated",
  manager_comment: "Manager comment",
  shared_goal_pushed: "Shared goal pushed",
  weightage_adjusted: "Weightage adjusted",
  user_created: "User created",
  user_updated: "User updated",
  cycle_updated: "Cycle updated",
  escalation_triggered: "Escalation",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const db = getDB();
  const filter = sp.filter ?? "all";
  const rows = db.audit.filter((r) => filter === "all" ? true : filter === "afterLock" ? r.afterLock : r.action === filter);
  const goalsById = new Map(db.goals.map((g) => [g.id, g] as const));
  const usersById = new Map(db.users.map((u) => [u.id, u] as const));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit trail</h1>
          <p className="page-subtitle">Every change is logged with actor and timestamp. Edits made after a goal is locked are highlighted.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="muted">Filter:</span>
          <a className={`badge ${filter === "all" ? "badge-primary" : "badge-neutral"}`} href="?filter=all">All</a>
          <a className={`badge ${filter === "afterLock" ? "badge-danger" : "badge-neutral"}`} href="?filter=afterLock">After-lock only</a>
          <a className={`badge ${filter === "goal_approved" ? "badge-success" : "badge-neutral"}`} href="?filter=goal_approved">Approvals</a>
          <a className={`badge ${filter === "goal_unlocked" ? "badge-warning" : "badge-neutral"}`} href="?filter=goal_unlocked">Unlocks</a>
          <a className={`badge ${filter === "checkin_updated" ? "badge-info" : "badge-neutral"}`} href="?filter=checkin_updated">Check-ins</a>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">No audit entries match this filter.</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const actor = usersById.get(r.actorId);
                const goal = r.targetType === "goal" ? goalsById.get(r.targetId) : undefined;
                return (
                  <tr key={r.id}>
                    <td style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatDateTime(r.at)}</td>
                    <td>{actor?.name ?? r.actorId}</td>
                    <td>
                      {actionLabel[r.action] ?? r.action}
                      {r.afterLock ? <span className="badge badge-danger" style={{ marginLeft: 6 }}>After lock</span> : null}
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        <div>{r.targetType}: <code>{r.targetId.slice(0, 12)}…</code></div>
                        {goal ? <div className="muted">{goal.title}</div> : null}
                      </div>
                    </td>
                    <td className="muted">{r.note ?? "—"}</td>
                    <td>
                      {goal && goal.state === "approved" && r.action !== "goal_unlocked" ? (
                        <UnlockButton goalId={goal.id} title={goal.title} />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
