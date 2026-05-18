"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { createUserAction, updateUserAction } from "@/lib/actions/admin";
import type { Role, User } from "@/lib/types";

export default function UsersClient({ users }: { users: User[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<User | null>(null);
  const [draft, setDraft] = useState<{ name: string; email: string; role: Role; managerId?: string; department: string; designation: string }>({
    name: "", email: "", role: "employee", managerId: "", department: "", designation: "",
  });

  const managers = users.filter((u) => u.role === "manager" || u.role === "admin");

  async function add() {
    startTransition(async () => {
      const res = await createUserAction({ ...draft, managerId: draft.managerId || undefined });
      if (!res.ok) { toast.error(res.error ?? "Create failed."); return; }
      toast.success("User added. Default password = role name.");
      setAddOpen(false);
      setDraft({ name: "", email: "", role: "employee", managerId: "", department: "", designation: "" });
      router.refresh();
    });
  }

  async function save() {
    if (!edit) return;
    startTransition(async () => {
      const res = await updateUserAction(edit.id, {
        name: edit.name, role: edit.role, managerId: edit.managerId || undefined,
        department: edit.department, designation: edit.designation,
      });
      if (!res.ok) { toast.error(res.error ?? "Save failed."); return; }
      toast.success("User updated.");
      setEdit(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users &amp; hierarchy</h1>
          <p className="page-subtitle">Manage employees, managers, and the reporting lines used by approval and escalation flows.</p>
        </div>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="plus" /> Add user</button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Reports to</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const mgr = users.find((x) => x.id === u.managerId);
              return (
                <tr key={u.id}>
                  <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="avatar" style={{ background: u.avatarColor, width: 24, height: 24, fontSize: 10 }}>
                      {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </span>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === "admin" ? "badge-primary" : u.role === "manager" ? "badge-warning" : "badge-info"}`}>{u.role}</span>
                  </td>
                  <td>{u.department}</td>
                  <td>{u.designation}</td>
                  <td>{mgr ? mgr.name : <span className="muted">—</span>}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEdit(u)}><Icon name="edit" /> Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {addOpen ? (
        <Modal
          open
          onClose={() => setAddOpen(false)}
          title="Add a new user"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={add} disabled={pending}><Icon name="plus" /> Add user</button>
            </>
          }
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div><label className="field-label">Name</label><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div><label className="field-label">Email</label><input type="email" className="input" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="field-label">Role</label>
                <select className="select" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager (L1)</option>
                  <option value="admin">Admin / HR</option>
                </select>
              </div>
              <div>
                <label className="field-label">Reports to (manager)</label>
                <select className="select" value={draft.managerId} onChange={(e) => setDraft({ ...draft, managerId: e.target.value })}>
                  <option value="">— none —</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="field-label">Department</label><input className="input" value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} /></div>
              <div><label className="field-label">Designation</label><input className="input" value={draft.designation} onChange={(e) => setDraft({ ...draft, designation: e.target.value })} /></div>
            </div>
            <div className="banner banner-info">
              <Icon name="info" /> The default password will be the role name (e.g. <span className="kbd">employee</span>). User can change later.
            </div>
          </div>
        </Modal>
      ) : null}

      {edit ? (
        <Modal
          open
          onClose={() => setEdit(null)}
          title={`Edit ${edit.name}`}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={pending}>Save</button>
            </>
          }
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div><label className="field-label">Name</label><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="field-label">Role</label>
                <select className="select" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager (L1)</option>
                  <option value="admin">Admin / HR</option>
                </select>
              </div>
              <div>
                <label className="field-label">Reports to</label>
                <select className="select" value={edit.managerId ?? ""} onChange={(e) => setEdit({ ...edit, managerId: e.target.value || undefined })}>
                  <option value="">— none —</option>
                  {managers.filter((m) => m.id !== edit.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="field-label">Department</label><input className="input" value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })} /></div>
              <div><label className="field-label">Designation</label><input className="input" value={edit.designation} onChange={(e) => setEdit({ ...edit, designation: e.target.value })} /></div>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
