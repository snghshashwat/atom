"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { StateBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import {
  approveSheetAction, returnSheetAction, updateGoalAction,
} from "@/lib/actions/goals";
import type { Goal, ThrustArea, User } from "@/lib/types";
import type { validateSheet } from "@/lib/validation";

interface Sheet {
  employee: User;
  goals: Goal[];
  validation: ReturnType<typeof validateSheet>;
  anySubmitted: boolean;
  allApproved: boolean;
}

export default function ApprovalsClient({ sheets, thrustAreas, cycleName }: {
  sheets: Sheet[];
  thrustAreas: ThrustArea[];
  cycleName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [returnFor, setReturnFor] = useState<Sheet | null>(null);
  const [reason, setReason] = useState("");
  const [tab, setTab] = useState<"pending" | "approved" | "all">("pending");

  const filtered = sheets.filter((s) =>
    tab === "pending" ? s.anySubmitted :
    tab === "approved" ? s.allApproved :
    true,
  );

  function refresh() { router.refresh(); }

  async function approve(s: Sheet) {
    if (!s.validation.ok) { toast.error(s.validation.blockers[0]); return; }
    startTransition(async () => {
      const res = await approveSheetAction(s.employee.id);
      if (!res.ok) { toast.error(res.error ?? "Approval failed."); return; }
      toast.success(`${s.employee.name}'s sheet approved and locked.`);
      refresh();
    });
  }

  async function returnSheet() {
    if (!returnFor) return;
    startTransition(async () => {
      const res = await returnSheetAction(returnFor.employee.id, reason);
      if (!res.ok) { toast.error(res.error ?? "Return failed."); return; }
      setReturnFor(null); setReason("");
      toast.success(`Returned to ${returnFor.employee.name} for rework.`);
      refresh();
    });
  }

  async function editInline(g: Goal, patch: Partial<Goal>) {
    startTransition(async () => {
      const res = await updateGoalAction(g.id, patch as never);
      if (!res.ok) { toast.error(res.error ?? "Edit failed."); return; }
      refresh();
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Approvals queue</h1>
          <p className="page-subtitle">{cycleName} · Review, inline-edit, return for rework, or approve to lock.</p>
        </div>
      </div>

      <div className="tab-row">
        <button className={`tab ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")}>Pending ({sheets.filter((s) => s.anySubmitted).length})</button>
        <button className={`tab ${tab === "approved" ? "active" : ""}`} onClick={() => setTab("approved")}>Approved ({sheets.filter((s) => s.allApproved).length})</button>
        <button className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>All ({sheets.length})</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
          <div style={{ fontWeight: 600, color: "var(--text)" }}>No sheets in this view.</div>
          <div style={{ marginTop: 4 }}>{tab === "pending" ? "You're all caught up." : "Nothing here yet."}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((s) => {
            const isOpen = open === s.employee.id;
            return (
              <div className="card" key={s.employee.id}>
                <div className="card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="avatar" style={{ background: s.employee.avatarColor }}>
                      {s.employee.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.employee.name}</div>
                      <div className="muted">{s.employee.designation} · {s.employee.department}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`badge ${s.validation.totalWeightage === 100 ? "badge-success" : "badge-warning"}`}>
                      {s.validation.totalWeightage}% weightage
                    </span>
                    <span className="badge badge-neutral">{s.goals.length} goal(s)</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setOpen(isOpen ? null : s.employee.id)}>
                      {isOpen ? "Hide" : "Review"} <Icon name="chevron-right" />
                    </button>
                  </div>
                </div>
                {isOpen ? (
                  <>
                    {s.goals.length === 0 ? (
                      <div className="card-body"><div className="empty">No goals on this sheet yet.</div></div>
                    ) : (
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Thrust area</th>
                            <th>UoM</th>
                            <th>Target</th>
                            <th style={{ width: 130 }}>Weightage</th>
                            <th>State</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.goals.map((g) => (
                            <tr key={g.id}>
                              <td>
                                <input className="input" defaultValue={g.title}
                                  disabled={g.state === "approved"}
                                  onBlur={(e) => e.target.value !== g.title && editInline(g, { title: e.target.value })}
                                />
                                {g.description ? <div className="muted" style={{ marginTop: 4 }}>{g.description}</div> : null}
                              </td>
                              <td>{thrustAreas.find((t) => t.id === g.thrustAreaId)?.name ?? g.thrustAreaId}</td>
                              <td style={{ fontSize: 12 }}>{g.uom}</td>
                              <td>
                                <input className="input" defaultValue={g.target} style={{ width: 120 }}
                                  disabled={g.state === "approved"}
                                  onBlur={(e) => e.target.value !== g.target && editInline(g, { target: e.target.value })}
                                />
                              </td>
                              <td>
                                <input type="number" min={10} max={100}
                                  className="input" defaultValue={g.weightage} style={{ width: 80 }}
                                  disabled={g.state === "approved"}
                                  onBlur={(e) => {
                                    const next = Number(e.target.value);
                                    if (next !== g.weightage) editInline(g, { weightage: next });
                                  }}
                                />
                              </td>
                              <td><StateBadge state={g.state} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <div className="card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {s.validation.blockers.length > 0 ? (
                          <span style={{ color: "var(--danger)" }}>{s.validation.blockers.join(" · ")}</span>
                        ) : (
                          <span>Sheet meets all submission rules.</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-secondary" disabled={pending || !s.anySubmitted}
                          onClick={() => { setReturnFor(s); setReason(""); }}>
                          <Icon name="alert" /> Return for rework
                        </button>
                        <button className="btn btn-success" disabled={pending || !s.anySubmitted || !s.validation.ok}
                          onClick={() => approve(s)}>
                          <Icon name="check" /> Approve &amp; lock
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {returnFor ? (
        <Modal
          open
          onClose={() => setReturnFor(null)}
          title={`Return ${returnFor.employee.name}'s sheet for rework`}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setReturnFor(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={returnSheet} disabled={pending || reason.trim().length < 3}>
                <Icon name="send" /> Send back
              </button>
            </>
          }
        >
          <label className="field-label">Reason — shared with employee</label>
          <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Increase weightage on revenue goal; clarify customer KPI target." />
          <div className="field-hint">Minimum 3 characters.</div>
        </Modal>
      ) : null}
    </>
  );
}
