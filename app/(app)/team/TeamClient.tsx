"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { managerCommentAction } from "@/lib/actions/goals";
import { overallAchievement, scoreFor } from "@/lib/scoring";
import type { Goal, Quarter, ThrustArea, User } from "@/lib/types";

interface Props {
  data: { employee: User; goals: Goal[] }[];
  thrustAreas: ThrustArea[];
  cycleName: string;
  activeQ: Quarter | null;
  quarterStates: Record<Quarter, "not_open" | "open" | "passed">;
}

const QS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export default function TeamClient({ data, thrustAreas, cycleName, activeQ, quarterStates }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Quarter>(activeQ ?? "Q1");
  const [comment, setComment] = useState<{ goal: Goal; existing: string } | null>(null);
  const [text, setText] = useState("");

  function openComment(g: Goal) {
    setComment({ goal: g, existing: g.checkins[tab]?.managerComment ?? "" });
    setText(g.checkins[tab]?.managerComment ?? "");
  }

  async function saveComment() {
    if (!comment) return;
    startTransition(async () => {
      const res = await managerCommentAction(comment.goal.id, tab, text);
      if (!res.ok) { toast.error(res.error ?? "Save failed."); return; }
      setComment(null);
      toast.success("Comment saved.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Team check-ins</h1>
          <p className="page-subtitle">{cycleName} · See planned vs. actual for each direct report and log structured check-in comments.</p>
        </div>
      </div>

      <div className="tab-row">
        {QS.map((q) => (
          <button key={q} className={`tab ${tab === q ? "active" : ""}`} onClick={() => setTab(q)}>
            {q}
            <span className={`badge ${quarterStates[q] === "open" ? "badge-success" : quarterStates[q] === "passed" ? "badge-neutral" : "badge-warning"}`} style={{ marginLeft: 8 }}>
              {quarterStates[q] === "open" ? "Open" : quarterStates[q] === "passed" ? "Closed" : "Not open"}
            </span>
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="empty">No direct reports yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {data.map(({ employee, goals }) => {
            const overall = overallAchievement(goals, tab);
            const anyData = goals.some((g) => g.checkins[tab]?.actual || g.checkins[tab]?.status);
            return (
              <div className="card" key={employee.id}>
                <div className="card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="avatar" style={{ background: employee.avatarColor }}>{employee.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{employee.name}</div>
                      <div className="muted">{employee.designation} · {employee.department}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={`badge ${anyData ? "badge-success" : "badge-warning"}`}>{anyData ? `${tab} updated` : `${tab} pending`}</span>
                    <div style={{ minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Overall {tab}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{overall != null ? `${overall}%` : "—"}</div>
                    </div>
                  </div>
                </div>
                {goals.length === 0 ? (
                  <div className="card-body"><div className="empty">No approved goals to track.</div></div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Goal</th>
                        <th>Thrust area</th>
                        <th>Target</th>
                        <th>{tab} actual</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {goals.map((g) => {
                        const c = g.checkins[tab] ?? {};
                        const score = scoreFor(g, tab);
                        return (
                          <tr key={g.id}>
                            <td style={{ fontWeight: 600 }}>{g.title}</td>
                            <td>{thrustAreas.find((t) => t.id === g.thrustAreaId)?.name}</td>
                            <td><code style={{ fontSize: 12 }}>{g.target}</code></td>
                            <td>{c.actual ? <code style={{ fontSize: 12 }}>{c.actual}</code> : <span className="muted">—</span>}</td>
                            <td><StatusBadge status={c.status} /></td>
                            <td>
                              {score == null ? <span className="muted">—</span> :
                                <div style={{ minWidth: 90 }}>
                                  <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{score}%</div>
                                  <div className="progress" style={{ marginTop: 4 }}><div style={{ width: `${score}%` }} /></div>
                                </div>}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openComment(g)} disabled={pending}>
                                <Icon name="edit" /> {c.managerComment ? "Edit" : "Add"} comment
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {comment ? (
        <Modal
          open
          onClose={() => setComment(null)}
          title={`Check-in comment · ${tab}`}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setComment(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveComment} disabled={pending || text.trim().length === 0}>
                <Icon name="send" /> Save comment
              </button>
            </>
          }
        >
          <div style={{ fontSize: 13, marginBottom: 12 }}><b>{comment.goal.title}</b></div>
          <label className="field-label">Comment</label>
          <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Document the discussion: progress, blockers, next steps." />
          {comment.existing ? <div className="field-hint">Replaces existing comment.</div> : null}
        </Modal>
      ) : null}
    </>
  );
}
