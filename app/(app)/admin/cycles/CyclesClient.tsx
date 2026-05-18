"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { resetDemoAction, setClockOffsetAction, updateCycleAction } from "@/lib/actions/admin";
import type { Cycle } from "@/lib/types";

function dateInput(iso: string): string {
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return ""; }
}

export default function CyclesClient({ cycles, clockOffsetDays }: { cycles: Cycle[]; clockOffsetDays: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [edit, setEdit] = useState<Record<string, Partial<Cycle>>>({});
  const [offset, setOffset] = useState(clockOffsetDays);

  function set(id: string, patch: Partial<Cycle>) {
    setEdit((e) => ({ ...e, [id]: { ...(e[id] ?? {}), ...patch } }));
  }

  async function save(c: Cycle) {
    const patch = edit[c.id] ?? {};
    if (Object.keys(patch).length === 0) { toast.info("No changes."); return; }
    // Convert date-only strings back to ISO
    const norm: Partial<Cycle> = { ...patch };
    for (const k of ["goalSettingOpens", "q1Opens", "q2Opens", "q3Opens", "q4Opens"] as const) {
      if (k in patch && typeof patch[k] === "string" && (patch[k] as string).length === 10) {
        norm[k] = new Date(patch[k] as string).toISOString();
      }
    }
    startTransition(async () => {
      const res = await updateCycleAction(c.id, norm);
      if (!res.ok) { toast.error(res.error ?? "Save failed."); return; }
      toast.success("Cycle saved.");
      setEdit((e) => { const { [c.id]: _, ...rest } = e; void _; return rest; });
      router.refresh();
    });
  }

  async function applyOffset() {
    startTransition(async () => {
      await setClockOffsetAction(offset);
      toast.success(`Demo clock offset set to ${offset} day(s).`);
      router.refresh();
    });
  }

  async function reset() {
    if (!confirm("Reset all demo data? This wipes goals, audit logs, notifications and reseeds users.")) return;
    startTransition(async () => {
      await resetDemoAction();
      toast.success("Demo reset.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cycles</h1>
          <p className="page-subtitle">Configure the goal-setting window and quarterly check-in dates. Advance the demo clock to walk through future quarters.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Demo clock</div>
            <div className="card-subtitle">Add or subtract days to simulate moving through the cycle. Reset with 0.</div>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="number" className="input" style={{ width: 120 }} value={offset} onChange={(e) => setOffset(Number(e.target.value))} />
          <span className="muted">days from real time</span>
          <button className="btn btn-primary" onClick={applyOffset} disabled={pending}>Apply</button>
          <button className="btn btn-secondary" onClick={() => { setOffset(0); }} disabled={pending}>Reset to 0</button>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn btn-danger" onClick={reset} disabled={pending}><Icon name="trash" /> Reset demo data</button>
          </div>
        </div>
      </div>

      {cycles.map((c) => {
        const local = { ...c, ...(edit[c.id] ?? {}) };
        return (
          <div className="card" key={c.id} style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <div className="card-title">{c.name}</div>
                <div className="card-subtitle">{c.active ? "Active cycle" : "Inactive"}</div>
              </div>
              <button className="btn btn-primary" onClick={() => save(c)} disabled={pending}>Save</button>
            </div>
            <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div>
                <label className="field-label">Name</label>
                <input className="input" defaultValue={c.name} onChange={(e) => set(c.id, { name: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Goal Setting opens</label>
                <input type="date" className="input" defaultValue={dateInput(c.goalSettingOpens)} onChange={(e) => set(c.id, { goalSettingOpens: e.target.value as never })} />
              </div>
              <div>
                <label className="field-label">Q1 opens</label>
                <input type="date" className="input" defaultValue={dateInput(c.q1Opens)} onChange={(e) => set(c.id, { q1Opens: e.target.value as never })} />
              </div>
              <div>
                <label className="field-label">Q2 opens</label>
                <input type="date" className="input" defaultValue={dateInput(c.q2Opens)} onChange={(e) => set(c.id, { q2Opens: e.target.value as never })} />
              </div>
              <div>
                <label className="field-label">Q3 opens</label>
                <input type="date" className="input" defaultValue={dateInput(c.q3Opens)} onChange={(e) => set(c.id, { q3Opens: e.target.value as never })} />
              </div>
              <div>
                <label className="field-label">Q4 / Annual opens</label>
                <input type="date" className="input" defaultValue={dateInput(c.q4Opens)} onChange={(e) => set(c.id, { q4Opens: e.target.value as never })} />
              </div>
              <div>
                <label className="field-label">Active</label>
                <label className="checkbox">
                  <input type="checkbox" defaultChecked={c.active} onChange={(e) => set(c.id, { active: e.target.checked })} />
                  Active
                </label>
              </div>
            </div>
            <div className="card-footer muted" style={{ fontSize: 12 }}>
              Local preview: Goal Setting opens {local.goalSettingOpens} · Q1 {local.q1Opens}
            </div>
          </div>
        );
      })}
    </>
  );
}
