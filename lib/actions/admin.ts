"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDB, newId, saveDB } from "@/lib/db";
import type { Cycle, EscalationRule, EscalationTrigger, Role, User } from "@/lib/types";

export async function updateCycleAction(cycleId: string, patch: Partial<Omit<Cycle, "id">>): Promise<{ ok: boolean; error?: string }> {
  const me = await requireRole("admin");
  const db = getDB();
  const c = db.cycles.find((c) => c.id === cycleId);
  if (!c) return { ok: false, error: "Cycle not found." };
  const before = { ...c };
  Object.assign(c, patch);
  saveDB(db);
  logAudit({ actorId: me.id, action: "cycle_updated", targetType: "cycle", targetId: c.id, before, after: { ...c } });
  revalidatePath("/admin/cycles");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setClockOffsetAction(days: number): Promise<{ ok: boolean }> {
  await requireRole("admin");
  const db = getDB();
  db.clockOffsetMs = days * 24 * 60 * 60 * 1000;
  saveDB(db);
  revalidatePath("/");
  return { ok: true };
}

export async function createUserAction(input: { name: string; email: string; role: Role; managerId?: string; department: string; designation: string }): Promise<{ ok: boolean; error?: string; user?: User }> {
  const me = await requireRole("admin");
  if (!input.name.trim() || !input.email.trim()) return { ok: false, error: "Name and email are required." };
  const db = getDB();
  if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false, error: "A user with that email already exists." };
  }
  const palette = ["#3b82f6", "#10b981", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#0ea5e9"];
  const u: User = {
    id: newId("u"),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.role,           // demo default password = role
    role: input.role,
    managerId: input.managerId,
    department: input.department,
    designation: input.designation,
    avatarColor: palette[db.users.length % palette.length],
  };
  db.users.push(u);
  saveDB(db);
  logAudit({ actorId: me.id, action: "user_created", targetType: "user", targetId: u.id, after: u });
  revalidatePath("/admin/users");
  return { ok: true, user: u };
}

export async function updateUserAction(id: string, patch: Partial<Pick<User, "name" | "role" | "managerId" | "department" | "designation" | "password">>): Promise<{ ok: boolean; error?: string }> {
  const me = await requireRole("admin");
  const db = getDB();
  const u = db.users.find((u) => u.id === id);
  if (!u) return { ok: false, error: "User not found." };
  // Prevent self-locking out — admin must remain at least one
  if (patch.role && patch.role !== "admin" && db.users.filter((x) => x.role === "admin" && x.id !== id).length === 0) {
    return { ok: false, error: "At least one admin must remain." };
  }
  if (patch.managerId === id) return { ok: false, error: "A user can't report to themselves." };
  const before = { ...u };
  Object.assign(u, patch);
  saveDB(db);
  logAudit({ actorId: me.id, action: "user_updated", targetType: "user", targetId: u.id, before, after: { ...u } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function saveEscalationRuleAction(rule: EscalationRule): Promise<{ ok: boolean }> {
  await requireRole("admin");
  const db = getDB();
  const idx = db.escalationRules.findIndex((r) => r.id === rule.id);
  if (idx === -1) db.escalationRules.push(rule); else db.escalationRules[idx] = rule;
  saveDB(db);
  revalidatePath("/admin/escalation");
  return { ok: true };
}

export async function deleteEscalationRuleAction(id: string): Promise<{ ok: boolean }> {
  await requireRole("admin");
  const db = getDB();
  db.escalationRules = db.escalationRules.filter((r) => r.id !== id);
  saveDB(db);
  revalidatePath("/admin/escalation");
  return { ok: true };
}

export async function createEscalationRuleAction(input: { name: string; trigger: EscalationTrigger; thresholdDays: number; notifyEmployee: boolean; notifyManager: boolean; notifyHR: boolean }): Promise<{ ok: boolean }> {
  await requireRole("admin");
  const db = getDB();
  db.escalationRules.push({ id: newId("esc"), enabled: true, ...input });
  saveDB(db);
  revalidatePath("/admin/escalation");
  return { ok: true };
}

export async function resolveEscalationAction(id: string): Promise<{ ok: boolean }> {
  await requireRole("admin");
  const db = getDB();
  const log = db.escalationLogs.find((l) => l.id === id);
  if (!log) return { ok: false };
  log.resolved = true;
  saveDB(db);
  revalidatePath("/admin/escalation");
  return { ok: true };
}

export async function resetDemoAction(): Promise<{ ok: boolean }> {
  await requireRole("admin");
  const { resetDB } = await import("@/lib/db");
  resetDB();
  revalidatePath("/");
  return { ok: true };
}

