"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import {
  createEscalationRuleAction, deleteEscalationRuleAction, saveEscalationRuleAction, resolveEscalationAction,
} from "@/lib/actions/admin";
import type { EscalationRule, EscalationTrigger } from "@/lib/types";

interface LogRow {
  id: string; at: string; ruleId: string; targetUserId: string; message: string; whenLabel: string; targetName: string; ruleName: string; resolved?: boolean;
}

export default function EscalationClient({ rules, logs }: { rules: EscalationRule[]; logs: LogRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", trigger: "no_submission" as EscalationTrigger, thresholdDays: 7, notifyEmployee: true, notifyManager: true, notifyHR: false });
  const [running, setRunning] = useState<{ triggered: number } | null>(null);
  const [logFilter, setLogFilter] = useState<"all" | "open" | "resolved">("all");

  function resolve(id: string) {
    startTransition(async () => {
      await resolveEscalationAction(id);
      toast.success("Escalation marked as resolved.");
      router.refresh();
    });
  }

  function patch(rule: EscalationRule, p: Partial<EscalationRule>) {
    startTransition(async () => {
      await saveEscalationRuleAction({ ...rule, ...p });
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this rule?")) return;
    startTransition(async () => {
      await deleteEscalationRuleAction(id);
      router.refresh();
    });
  }

  async function add() {
    startTransition(async () => {
      await createEscalationRuleAction(draft);
      setAddOpen(false);
      setDraft({ name: "", trigger: "no_submission", thresholdDays: 7, notifyEmployee: true, notifyManager: true, notifyHR: false });
      toast.success("Rule created.");
      router.refresh();
    });
  }

  async function runNow() {
    const res = await fetch("/api/escalation/run", { method: "POST" });
    const json = await res.json();
    setRunning({ triggered: json.triggered ?? 0 });
    toast.success(`Escalation pass: ${json.triggered ?? 0} new escalation(s) fired.`);
    router.refresh();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Escalation rules</h1>
          <p className="page-subtitle">Configure thresholds and recipients. Run the rule engine on demand to see what would fire right now.</p>
        </div>
        <div className="toolbar">
          <button className="btn btn-secondary" onClick={runNow}><Icon name="play" /> Run engine now</button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="plus" /> Add rule</button>
        </div>
      </div>

      {running ? (
        <div className="banner banner-info" style={{ marginBottom: 12 }}>
          <Icon name="info" /> Last run triggered {running.triggered} escalation(s). See the log below.
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><div className="card-title">Active rules</div></div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Trigger</th>
              <th>Threshold</th>
              <th>Notify</th>
              <th>Enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong></td>
                <td>{labelTrigger(r.trigger)}</td>
                <td>
                  <input type="number" className="input" defaultValue={r.thresholdDays} style={{ width: 80 }}
                    onBlur={(e) => { const v = Number(e.target.value); if (v !== r.thresholdDays) patch(r, { thresholdDays: v }); }} /> days
                </td>
                <td style={{ display: "flex", gap: 8 }}>
                  <label className="checkbox"><input type="checkbox" defaultChecked={r.notifyEmployee} onChange={(e) => patch(r, { notifyEmployee: e.target.checked })} /> Employee</label>
                  <label className="checkbox"><input type="checkbox" defaultChecked={r.notifyManager} onChange={(e) => patch(r, { notifyManager: e.target.checked })} /> Manager</label>
                  <label className="checkbox"><input type="checkbox" defaultChecked={r.notifyHR} onChange={(e) => patch(r, { notifyHR: e.target.checked })} /> HR</label>
                </td>
                <td>
                  <label className="checkbox"><input type="checkbox" defaultChecked={r.enabled} onChange={(e) => patch(r, { enabled: e.target.checked })} /> Enabled</label>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(r.id)} disabled={pending}><Icon name="trash" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Escalation log</div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["all", "open", "resolved"] as const).map((f) => (
              <button key={f} className={`btn btn-sm ${logFilter === f ? "btn-primary" : "btn-secondary"}`} onClick={() => setLogFilter(f)}>
                {f === "all" ? `All (${logs.length})` : f === "open" ? `Open (${logs.filter((l) => !l.resolved).length})` : `Resolved (${logs.filter((l) => l.resolved).length})`}
              </button>
            ))}
          </div>
        </div>
        {logs.length === 0 ? (
          <div className="card-body"><div className="empty">No escalations yet. Use <b>Run engine now</b> to test.</div></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Rule</th>
                <th>Target</th>
                <th>Message</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.filter((l) => logFilter === "all" ? true : logFilter === "open" ? !l.resolved : l.resolved).map((l) => (
                <tr key={l.id} style={{ opacity: l.resolved ? 0.6 : 1 }}>
                  <td style={{ whiteSpace: "nowrap" }}>{l.whenLabel}</td>
                  <td>{l.ruleName}</td>
                  <td>{l.targetName}</td>
                  <td>{l.message}</td>
                  <td>
                    <span className={`badge ${l.resolved ? "badge-success" : "badge-warning"}`}>
                      {l.resolved ? "Resolved" : "Open"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {!l.resolved ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => resolve(l.id)} disabled={pending}>
                        <Icon name="check" /> Resolve
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {addOpen ? (
        <Modal
          open
          onClose={() => setAddOpen(false)}
          title="Add an escalation rule"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={add} disabled={pending}>Create</button>
            </>
          }
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div><label className="field-label">Name</label><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g., Q1 check-in missed" /></div>
            <div>
              <label className="field-label">Trigger</label>
              <select className="select" value={draft.trigger} onChange={(e) => setDraft({ ...draft, trigger: e.target.value as EscalationTrigger })}>
                <option value="no_submission">Employee hasn&apos;t submitted goals</option>
                <option value="no_approval">Manager hasn&apos;t approved goals</option>
                <option value="no_checkin">Quarterly check-in not completed</option>
              </select>
            </div>
            <div><label className="field-label">Threshold (days)</label><input type="number" className="input" value={draft.thresholdDays} onChange={(e) => setDraft({ ...draft, thresholdDays: Number(e.target.value) })} /></div>
            <div style={{ display: "flex", gap: 12 }}>
              <label className="checkbox"><input type="checkbox" checked={draft.notifyEmployee} onChange={(e) => setDraft({ ...draft, notifyEmployee: e.target.checked })} /> Notify employee</label>
              <label className="checkbox"><input type="checkbox" checked={draft.notifyManager} onChange={(e) => setDraft({ ...draft, notifyManager: e.target.checked })} /> Notify manager</label>
              <label className="checkbox"><input type="checkbox" checked={draft.notifyHR} onChange={(e) => setDraft({ ...draft, notifyHR: e.target.checked })} /> Notify HR / Admin</label>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function labelTrigger(t: EscalationTrigger): string {
  switch (t) {
    case "no_submission": return "No goal submission";
    case "no_approval": return "No manager approval";
    case "no_checkin": return "Missed quarterly check-in";
  }
}
