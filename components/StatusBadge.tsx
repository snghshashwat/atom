import type { GoalState, GoalStatus } from "@/lib/types";

export function StateBadge({ state }: { state: GoalState }) {
  const map: Record<GoalState, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "badge-neutral" },
    submitted: { label: "Submitted · Pending L1", cls: "badge-info" },
    returned: { label: "Returned for rework", cls: "badge-warning" },
    approved: { label: "Approved · Locked", cls: "badge-success" },
    unlocked: { label: "Unlocked by Admin", cls: "badge-warning" },
  };
  const m = map[state];
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

export function StatusBadge({ status }: { status?: GoalStatus }) {
  if (!status) return <span className="badge badge-neutral">No status</span>;
  const map: Record<GoalStatus, { label: string; cls: string }> = {
    not_started: { label: "Not started", cls: "badge-neutral" },
    on_track: { label: "On track", cls: "badge-info" },
    completed: { label: "Completed", cls: "badge-success" },
  };
  const m = map[status];
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}
