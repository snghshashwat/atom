"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { saveCheckinAction } from "@/lib/actions/goals";
import { scoreFor } from "@/lib/scoring";
import type { Goal, GoalStatus, Quarter, ThrustArea } from "@/lib/types";

interface Props {
  goals: Goal[];
  thrustAreas: ThrustArea[];
  cycleName: string;
  activeQ: Quarter | null;
  quarterStates: Record<Quarter, "not_open" | "open" | "passed">;
}

const QS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export default function CheckinsClient({ goals, thrustAreas, cycleName, activeQ, quarterStates }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Quarter>(activeQ ?? "Q1");

  async function save(g: Goal, q: Quarter, patch: { actual?: string; status?: GoalStatus }) {
    startTransition(async () => {
      const res = await saveCheckinAction(g.id, q, patch);
      if (!res.ok) { toast.error(res.error ?? "Save failed."); return; }
      toast.success(`${q} update saved.`);
      router.refresh();
    });
  }

  const wOpen = quarterStates[tab] === "open";

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My check-ins</h1>
          <p className="page-subtitle">{cycleName} · Log quarterly actuals and status against your approved goals.</p>
        </div>
      </div>

      <div className="tab-row">
        {QS.map((q) => {
          const state = quarterStates[q];
          const active = tab === q;
          return (
            <button key={q} className={`tab ${active ? "active" : ""}`} onClick={() => setTab(q)}>
              {q} Check-in
              <span className={`badge ${state === "open" ? "badge-success" : state === "passed" ? "badge-neutral" : "badge-warning"}`} style={{ marginLeft: 8 }}>
                {state === "open" ? "Open" : state === "passed" ? "Closed" : "Not open"}
              </span>
            </button>
          );
        })}
      </div>

      {goals.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
          <div style={{ fontWeight: 600, color: "var(--text)" }}>No approved goals yet.</div>
          <div style={{ marginTop: 4 }}>Submit your sheet and have it approved by your manager to log check-ins.</div>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "28%" }}>Goal</th>
                <th>Target</th>
                <th>{tab} actual</th>
                <th style={{ width: 160 }}>{tab} status</th>
                <th style={{ width: 110 }}>Score</th>
                <th>Manager comment</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g) => {
                const checkin = g.checkins[tab] ?? {};
                const score = scoreFor(g, tab);
                return (
                  <tr key={g.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{g.title}</div>
                      <div className="muted">{thrustAreas.find((t) => t.id === g.thrustAreaId)?.name} · {g.weightage}%</div>
                    </td>
                    <td><code style={{ fontSize: 12 }}>{g.target}</code></td>
                    <td>
                      {g.uom === "timeline" ? (
                        <input type="date" className="input" defaultValue={checkin.actual ?? ""} disabled={!wOpen || pending}
                          onBlur={(e) => e.target.value !== (checkin.actual ?? "") && save(g, tab, { actual: e.target.value })} />
                      ) : g.uom === "zero" ? (
                        <input type="number" className="input" defaultValue={checkin.actual ?? ""} placeholder="e.g., 0 if no incidents"
                          disabled={!wOpen || pending}
                          onBlur={(e) => e.target.value !== (checkin.actual ?? "") && save(g, tab, { actual: e.target.value })} />
                      ) : (
                        <input className="input" defaultValue={checkin.actual ?? ""} disabled={!wOpen || pending}
                          onBlur={(e) => e.target.value !== (checkin.actual ?? "") && save(g, tab, { actual: e.target.value })} />
                      )}
                    </td>
                    <td>
                      <select className="select" defaultValue={checkin.status ?? ""} disabled={!wOpen || pending}
                        onChange={(e) => save(g, tab, { status: (e.target.value || undefined) as GoalStatus | undefined })}>
                        <option value="">— select —</option>
                        <option value="not_started">Not started</option>
                        <option value="on_track">On track</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td>
                      {score == null ? <span className="muted">—</span> : (
                        <div>
                          <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{score}%</div>
                          <div className="progress" style={{ marginTop: 4 }}><div style={{ width: `${score}%` }} /></div>
                        </div>
                      )}
                    </td>
                    <td>
                      {checkin.managerComment ? (
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontStyle: "italic", color: "var(--text)" }}>“{checkin.managerComment}”</div>
                          <div className="muted" style={{ marginTop: 2 }}>logged {checkin.managerCommentAt ? new Date(checkin.managerCommentAt).toLocaleString() : "—"}</div>
                        </div>
                      ) : <span className="muted">No comment yet</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16, fontSize: 12, color: "var(--text-muted)" }}>
        <span>Score formulas:</span>
        <span><b>Higher better</b>: Actual ÷ Target</span>
        <span><b>Lower better</b>: Target ÷ Actual</span>
        <span><b>Timeline</b>: 100% on or before deadline, −5 per day late</span>
        <span><b>Zero</b>: 100% if 0, else 0%</span>
      </div>
      <p style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>Status: <StatusBadge status="not_started" /> {" "}<StatusBadge status="on_track" /> {" "}<StatusBadge status="completed" /></p>
    </>
  );
}
