"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { unlockGoalAction } from "@/lib/actions/goals";

export default function UnlockButton({ goalId, title }: { goalId: string; title: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}><Icon name="unlock" /> Unlock</button>
      {open ? (
        <Modal
          open
          onClose={() => setOpen(false)}
          title={`Unlock "${title}"`}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-danger" disabled={pending || reason.trim().length < 3} onClick={() => {
                startTransition(async () => {
                  const res = await unlockGoalAction(goalId, reason);
                  if (!res.ok) { toast.error(res.error ?? "Failed."); return; }
                  toast.success("Goal unlocked.");
                  setOpen(false);
                  router.refresh();
                });
              }}>
                <Icon name="unlock" /> Unlock with audit trail
              </button>
            </>
          }
        >
          <p>The goal will be reopened for edits. The reason and your identity are stored in the audit log permanently.</p>
          <label className="field-label" style={{ marginTop: 12 }}>Reason</label>
          <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Sales restructure: target updated by leadership." />
        </Modal>
      ) : null}
    </>
  );
}
