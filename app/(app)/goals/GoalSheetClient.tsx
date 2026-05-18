"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { StateBadge, StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import {
  createGoalAction, deleteGoalAction, submitSheetAction, updateGoalAction,
} from "@/lib/actions/goals";
import type { Goal, ThrustArea, UoM } from "@/lib/types";
import { MIN_WEIGHTAGE, validateSheet, MAX_GOALS_PER_EMPLOYEE } from "@/lib/validation";

interface Props {
  initialGoals: Goal[];
  thrustAreas: ThrustArea[];
  cycleName: string;
  settingOpen: boolean;
  initialValidation: ReturnType<typeof validateSheet>;
  returnReason: string | null;
  isAdmin: boolean;
}

interface Draft {
  thrustAreaId: string;
  title: string;
  description: string;
  uom: UoM;
  target: string;
  weightage: number;
}

const emptyDraft: Draft = {
  thrustAreaId: "",
  title: "",
  description: "",
  uom: "min",
  target: "",
  weightage: 10,
};

export default function GoalSheetClient({
  initialGoals, thrustAreas, cycleName, settingOpen, returnReason, isAdmin,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const v = useMemo(() => validateSheet(goals), [goals]);

  const sheetLocked = goals.length > 0 && goals.every((g) => g.state === "approved");
  const awaitingApproval = goals.some((g) => g.state === "submitted");
  const returned = goals.some((g) => g.state === "returned");
  const canEditSheet = settingOpen && !sheetLocked && !awaitingApproval;

  function refresh() { router.refresh(); }

  function startAdd() {
    setDraft(emptyDraft);
    setFieldErrors({});
    setAddOpen(true);
  }

  function startEdit(g: Goal) {
    setEditing(g);
    setDraft({
      thrustAreaId: g.thrustAreaId,
      title: g.title,
      description: g.description,
      uom: g.uom,
      target: g.target,
      weightage: g.weightage,
    });
    setFieldErrors({});
  }

  async function addGoal() {
    startTransition(async () => {
      const res = await createGoalAction(draft);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't add the goal.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }
      if (res.goal) setGoals((prev) => [...prev, res.goal!]);
      setAddOpen(false);
      toast.success("Goal added.");
      refresh();
    });
  }

  async function saveEdit() {
    if (!editing) return;
    startTransition(async () => {
      const res = await updateGoalAction(editing.id, draft);
      if (!res.ok) { toast.error(res.error ?? "Save failed."); return; }
      setGoals((prev) => prev.map((g) => g.id === editing.id ? { ...g, ...draft } : g));
      setEditing(null);
      toast.success("Goal updated.");
      refresh();
    });
  }

  async function remove(g: Goal) {
    if (!confirm(`Remove "${g.title}"?`)) return;
    startTransition(async () => {
      const res = await deleteGoalAction(g.id);
      if (!res.ok) { toast.error(res.error ?? "Delete failed."); return; }
      setGoals((prev) => prev.filter((x) => x.id !== g.id));
      toast.success("Goal removed.");
      refresh();
    });
  }

  async function submitSheet() {
    if (!v.ok) { toast.error(v.blockers[0]); return; }
    startTransition(async () => {
      const res = await submitSheetAction();
      if (!res.ok) { toast.error(res.error ?? "Couldn't submit."); return; }
      toast.success("Goal sheet submitted for manager approval.");
      refresh();
    });
  }

  async function updateWeightage(g: Goal, weightage: number) {
    if (g.state === "approved" && !isAdmin) return;
    if (g.sharedSourceId) {
      // recipients can adjust their own weightage
    }
    startTransition(async () => {
      const res = await updateGoalAction(g.id, { weightage });
      if (!res.ok) { toast.error(res.error ?? "Save failed."); return; }
      setGoals((prev) => prev.map((x) => x.id === g.id ? { ...x, weightage } : x));
      refresh();
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My goal sheet</h1>
          <p className="page-subtitle">{cycleName} · Total weightage must equal 100%, with each goal at least {MIN_WEIGHTAGE}% (max {MAX_GOALS_PER_EMPLOYEE} goals).</p>
        </div>
        <div className="toolbar">
          {canEditSheet ? (
            <button className="btn btn-secondary" onClick={startAdd} disabled={pending || goals.length >= MAX_GOALS_PER_EMPLOYEE}><Icon name="plus" /> Add goal</button>
          ) : null}
          {goals.length > 0 && !sheetLocked && !awaitingApproval ? (
            <button className="btn btn-primary" onClick={submitSheet} disabled={pending || !v.ok}>
              <Icon name="send" /> Submit for approval
            </button>
          ) : null}
        </div>
      </div>

      {!settingOpen && !sheetLocked ? (
        <div className="banner banner-warning" style={{ marginBottom: 12 }}>
          <Icon name="info" />
          <div>Goal setting window is closed for this cycle. New edits aren&apos;t allowed.</div>
        </div>
      ) : null}
      {sheetLocked ? (
        <div className="banner banner-success" style={{ marginBottom: 12 }}>
          <Icon name="lock" />
          <div>Your sheet has been approved and locked. Use the <b>Check-ins</b> page to log quarterly actuals.</div>
        </div>
      ) : null}
      {awaitingApproval ? (
        <div className="banner banner-info" style={{ marginBottom: 12 }}>
          <Icon name="info" />
          <div>Submitted to your manager. Your sheet is read-only while awaiting review.</div>
        </div>
      ) : null}
      {returned && returnReason ? (
        <div className="banner banner-warning" style={{ marginBottom: 12 }}>
          <Icon name="alert" />
          <div><b>Returned for rework: </b>{returnReason}</div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <strong>Total weightage</strong>
              <span style={{ fontVariantNumeric: "tabular-nums", color: v.totalWeightage === 100 ? "var(--success)" : "var(--danger)" }}>
                {v.totalWeightage}% / 100%
              </span>
            </div>
            <div className={`progress ${v.totalWeightage === 100 ? "success" : v.totalWeightage > 100 ? "danger" : "warning"}`}>
              <div style={{ width: `${Math.min(100, v.totalWeightage)}%` }} />
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
              <span>{v.count} / {MAX_GOALS_PER_EMPLOYEE} goals</span>
              <span>Min {MIN_WEIGHTAGE}% per goal</span>
              {v.blockers.map((b, i) => <span key={i} style={{ color: "var(--danger)" }}>· {b}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {goals.length === 0 ? (
          <div className="card-body">
            <div className="empty">
              <div style={{ fontSize: 28, marginBottom: 6 }}>🎯</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>No goals yet</div>
              <div style={{ marginTop: 4 }}>Start by adding a SMART goal aligned to a thrust area.</div>
              {canEditSheet ? (
                <button className="btn btn-primary" onClick={startAdd} style={{ marginTop: 12 }}><Icon name="plus" /> Add your first goal</button>
              ) : null}
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "26%" }}>Title</th>
                <th>Thrust area</th>
                <th>UoM</th>
                <th>Target</th>
                <th style={{ width: 140 }}>Weightage</th>
                <th>State</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g) => {
                const ta = thrustAreas.find((t) => t.id === g.thrustAreaId)?.name ?? g.thrustAreaId;
                const editable = canEditSheet || (isAdmin) || (g.sharedSourceId != null && !sheetLocked);
                const weightOnly = g.sharedSourceId != null;
                return (
                  <tr key={g.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{g.title}</div>
                      {g.description ? <div className="muted" style={{ marginTop: 2 }}>{g.description}</div> : null}
                      {g.isShared || g.sharedSourceId ? (
                        <span className="badge badge-info" style={{ marginTop: 6 }}><Icon name="share" /> Shared</span>
                      ) : null}
                    </td>
                    <td>{ta}</td>
                    <td>{uomLabel(g.uom)}</td>
                    <td><code style={{ fontSize: 12 }}>{g.target}</code></td>
                    <td>
                      {editable || weightOnly ? (
                        <input
                          type="number"
                          min={MIN_WEIGHTAGE}
                          max={100}
                          className="input"
                          style={{ height: 30, width: 90 }}
                          defaultValue={g.weightage}
                          onBlur={(e) => {
                            const next = Number(e.target.value);
                            if (next === g.weightage) return;
                            updateWeightage(g, next);
                          }}
                          disabled={pending}
                        />
                      ) : <span>{g.weightage}%</span>}
                    </td>
                    <td><StateBadge state={g.state} /></td>
                    <td style={{ textAlign: "right" }}>
                      {editable && !weightOnly ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(g)} disabled={pending}><Icon name="edit" /></button>
                      ) : null}
                      {(canEditSheet && !weightOnly) || isAdmin ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => remove(g)} disabled={pending}><Icon name="trash" /></button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(addOpen || editing) && (
        <Modal
          open
          onClose={() => { setAddOpen(false); setEditing(null); }}
          title={editing ? "Edit goal" : "Add a new goal"}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setAddOpen(false); setEditing(null); }}>Cancel</button>
              <button className="btn btn-primary" disabled={pending} onClick={editing ? saveEdit : addGoal}>
                {editing ? "Save changes" : "Add goal"}
              </button>
            </>
          }
        >
          <GoalForm
            draft={draft}
            setDraft={setDraft}
            fieldErrors={fieldErrors}
            thrustAreas={thrustAreas}
            isShared={editing?.sharedSourceId != null}
          />
        </Modal>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-faint)" }}>
        Status reference:{" "}<StatusBadge status="not_started" /> {" "}<StatusBadge status="on_track" /> {" "}<StatusBadge status="completed" />
      </p>
    </>
  );
}

function uomLabel(u: UoM): string {
  switch (u) {
    case "min": return "Numeric / % (higher better)";
    case "max": return "Numeric / % (lower better)";
    case "timeline": return "Timeline (date)";
    case "zero": return "Zero-based";
  }
}

function GoalForm({
  draft, setDraft, fieldErrors, thrustAreas, isShared,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  fieldErrors: Record<string, string>;
  thrustAreas: ThrustArea[];
  isShared?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <label className="field-label">Thrust area</label>
        <select className={`select ${fieldErrors.thrustAreaId ? "is-error" : ""}`} disabled={isShared}
          value={draft.thrustAreaId} onChange={(e) => setDraft((d) => ({ ...d, thrustAreaId: e.target.value }))}>
          <option value="">Select a thrust area…</option>
          {thrustAreas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {fieldErrors.thrustAreaId ? <div className="field-error">{fieldErrors.thrustAreaId}</div> : null}
      </div>
      <div>
        <label className="field-label">Goal title</label>
        <input className={`input ${fieldErrors.title ? "is-error" : ""}`} disabled={isShared}
          value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="e.g., Achieve $1.2M in new ARR" />
        {fieldErrors.title ? <div className="field-error">{fieldErrors.title}</div> : null}
      </div>
      <div>
        <label className="field-label">Description</label>
        <textarea className="textarea" disabled={isShared}
          value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          placeholder="What does success look like? How is this measured?" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <label className="field-label">Unit of measurement</label>
          <select className="select" value={draft.uom} disabled={isShared}
            onChange={(e) => setDraft((d) => ({ ...d, uom: e.target.value as UoM, target: e.target.value === "zero" ? "0" : d.target }))}>
            <option value="min">Numeric / % — Higher is better</option>
            <option value="max">Numeric / % — Lower is better</option>
            <option value="timeline">Timeline (date)</option>
            <option value="zero">Zero-based (0 = success)</option>
          </select>
        </div>
        <div>
          <label className="field-label">Target</label>
          {draft.uom === "timeline" ? (
            <input type="date" className={`input ${fieldErrors.target ? "is-error" : ""}`} disabled={isShared}
              value={draft.target} onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))} />
          ) : (
            <input className={`input ${fieldErrors.target ? "is-error" : ""}`} disabled={isShared || draft.uom === "zero"}
              value={draft.target} onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}
              placeholder={draft.uom === "zero" ? "0" : draft.uom === "max" ? "e.g., 200" : "e.g., 1200000"} />
          )}
          {fieldErrors.target ? <div className="field-error">{fieldErrors.target}</div> : null}
        </div>
        <div>
          <label className="field-label">Weightage (%)</label>
          <input type="number" min={MIN_WEIGHTAGE} max={100}
            className={`input ${fieldErrors.weightage ? "is-error" : ""}`}
            value={draft.weightage}
            onChange={(e) => setDraft((d) => ({ ...d, weightage: Number(e.target.value) }))} />
          {fieldErrors.weightage ? <div className="field-error">{fieldErrors.weightage}</div> : <div className="field-hint">Min {MIN_WEIGHTAGE}%</div>}
        </div>
      </div>
    </div>
  );
}
