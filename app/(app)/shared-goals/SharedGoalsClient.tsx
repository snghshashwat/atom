"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { pushSharedGoalAction } from "@/lib/actions/shared";
import type { Goal, ThrustArea, UoM, User } from "@/lib/types";

interface ExistingPrimary {
  primary: Goal;
  ownerName: string;
  copies: Goal[];
}

interface Props {
  cycleName: string;
  thrustAreas: ThrustArea[];
  users: User[];
  recipients: User[];
  existing: ExistingPrimary[];
  asAdmin: boolean;
}

export default function SharedGoalsClient({ cycleName, thrustAreas, users, recipients, existing, asAdmin }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    primaryOwnerId: recipients[0]?.id ?? "",
    thrustAreaId: thrustAreas[0]?.id ?? "",
    title: "",
    description: "",
    uom: "min" as UoM,
    target: "",
    weightage: 20,
    recipientIds: [] as string[],
  });

  function toggleRecipient(id: string) {
    setDraft((d) => ({
      ...d,
      recipientIds: d.recipientIds.includes(id) ? d.recipientIds.filter((x) => x !== id) : [...d.recipientIds, id],
    }));
  }

  async function push() {
    startTransition(async () => {
      const res = await pushSharedGoalAction(draft);
      if (!res.ok) { toast.error(res.error ?? "Push failed."); return; }
      toast.success(`Shared goal pushed to ${draft.recipientIds.length} recipient(s).`);
      setOpen(false);
      setDraft((d) => ({ ...d, title: "", description: "", target: "", recipientIds: [] }));
      router.refresh();
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shared goals</h1>
          <p className="page-subtitle">
            {cycleName} · Push a departmental KPI to multiple employees. Recipients can adjust their own weightage but the title and target are read-only.
            Achievement updates by the primary owner sync to every linked sheet.
          </p>
        </div>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="share" /> Push shared goal</button>
        </div>
      </div>

      {existing.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 28, marginBottom: 6 }}>📡</div>
          <div style={{ fontWeight: 600, color: "var(--text)" }}>No shared goals pushed yet.</div>
          <div style={{ marginTop: 4 }}>Use the button above to cascade a department or org KPI to {asAdmin ? "selected employees" : "your direct reports"}.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {existing.map(({ primary, ownerName, copies }) => (
            <div className="card" key={primary.id}>
              <div className="card-header">
                <div>
                  <div className="card-title">{primary.title}</div>
                  <div className="card-subtitle">Primary owner: <b>{ownerName}</b> · {thrustAreas.find((t) => t.id === primary.thrustAreaId)?.name} · UoM {primary.uom} · Target {primary.target}</div>
                </div>
                <span className="badge badge-info"><Icon name="share" /> {copies.length} recipient(s)</span>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Weightage</th>
                    <th>State</th>
                    <th>Synced last</th>
                  </tr>
                </thead>
                <tbody>
                  {copies.map((c) => {
                    const u = users.find((x) => x.id === c.ownerId);
                    return (
                      <tr key={c.id}>
                        <td style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span className="avatar" style={{ background: u?.avatarColor ?? "#64748b", width: 24, height: 24, fontSize: 10 }}>
                            {u?.name.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "?"}
                          </span>
                          <span>{u?.name ?? c.ownerId}</span>
                        </td>
                        <td>{c.weightage}%</td>
                        <td>{c.state}</td>
                        <td>{new Date(c.updatedAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Push a shared goal"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={push} disabled={pending}><Icon name="send" /> Push to {draft.recipientIds.length} recipient(s)</button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="field-label">Primary owner (drives achievement updates)</label>
            <select className="select" value={draft.primaryOwnerId} onChange={(e) => setDraft((d) => ({ ...d, primaryOwnerId: e.target.value }))}>
              {recipients.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.designation}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="field-label">Thrust area</label>
              <select className="select" value={draft.thrustAreaId} onChange={(e) => setDraft((d) => ({ ...d, thrustAreaId: e.target.value }))}>
                {thrustAreas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">UoM</label>
              <select className="select" value={draft.uom} onChange={(e) => setDraft((d) => ({ ...d, uom: e.target.value as UoM, target: e.target.value === "zero" ? "0" : d.target }))}>
                <option value="min">Higher is better</option>
                <option value="max">Lower is better</option>
                <option value="timeline">Timeline (date)</option>
                <option value="zero">Zero-based</option>
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Title</label>
            <input className="input" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="e.g., Reduce departmental TAT" />
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea className="textarea" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="field-label">Target</label>
              {draft.uom === "timeline" ? (
                <input type="date" className="input" value={draft.target} onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))} />
              ) : (
                <input className="input" value={draft.target} disabled={draft.uom === "zero"} onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))} />
              )}
            </div>
            <div>
              <label className="field-label">Default weightage (%)</label>
              <input type="number" className="input" min={10} max={100} value={draft.weightage} onChange={(e) => setDraft((d) => ({ ...d, weightage: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="field-label">Recipients</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 6, maxHeight: 240, overflow: "auto", border: "1px solid var(--border)", padding: 8, borderRadius: 6 }}>
              {recipients.map((r) => (
                <label key={r.id} className="checkbox" style={{ padding: 6 }}>
                  <input type="checkbox" checked={draft.recipientIds.includes(r.id)} onChange={() => toggleRecipient(r.id)} />
                  <span className="avatar" style={{ background: r.avatarColor, width: 22, height: 22, fontSize: 10 }}>
                    {r.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </span>
                  <span style={{ fontSize: 13 }}>{r.name}</span>
                  <span className="muted" style={{ fontSize: 11 }}>· {r.department}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
