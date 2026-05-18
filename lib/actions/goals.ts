"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getActiveCycle, goalSettingState } from "@/lib/cycles";
import { getDB, newId, now, saveDB } from "@/lib/db";
import { notify } from "@/lib/notify";
import { syncSharedAchievement } from "@/lib/sharedGoals";
import type { Goal, GoalStatus, Quarter, UoM } from "@/lib/types";
import { MAX_GOALS_PER_EMPLOYEE, validateGoalDraft, validateSheet } from "@/lib/validation";

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createGoalAction(input: {
  thrustAreaId: string;
  title: string;
  description: string;
  uom: UoM;
  target: string;
  weightage: number;
}): Promise<ActionResult & { goal?: Goal }> {
  const user = await requireUser();
  if (user.role !== "employee" && user.role !== "admin") {
    return { ok: false, error: "Only employees can add goals to their sheet." };
  }
  const cycle = getActiveCycle();
  if (goalSettingState(cycle) === "passed") {
    return { ok: false, error: "Goal setting window has closed for the current cycle." };
  }
  const v = validateGoalDraft({ ...input });
  if (!v.ok) {
    return { ok: false, error: v.errors[0], fieldErrors: v.fieldErrors as Record<string, string> };
  }
  const db = getDB();
  const existing = db.goals.filter((g) => g.ownerId === user.id && g.cycleId === cycle.id);
  if (existing.length >= MAX_GOALS_PER_EMPLOYEE) {
    return { ok: false, error: `You already have ${MAX_GOALS_PER_EMPLOYEE} goals — the maximum allowed.` };
  }
  const goal: Goal = {
    id: newId("g"),
    cycleId: cycle.id,
    ownerId: user.id,
    thrustAreaId: input.thrustAreaId,
    title: input.title.trim(),
    description: input.description.trim(),
    uom: input.uom,
    target: input.target.trim(),
    weightage: input.weightage,
    state: "draft",
    createdAt: now(),
    updatedAt: now(),
    checkins: {},
  };
  db.goals.push(goal);
  saveDB(db);
  logAudit({ actorId: user.id, action: "goal_created", targetType: "goal", targetId: goal.id, after: goal });
  revalidatePath("/goals");
  return { ok: true, goal };
}

export async function updateGoalAction(id: string, patch: Partial<Pick<Goal, "thrustAreaId" | "title" | "description" | "uom" | "target" | "weightage">>): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDB();
  const g = db.goals.find((g) => g.id === id);
  if (!g) return { ok: false, error: "Goal not found." };
  const isManagerForOwner = user.role === "manager" && db.users.find((u) => u.id === g.ownerId)?.managerId === user.id;
  const isOwner = g.ownerId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin && !isManagerForOwner) {
    return { ok: false, error: "You can't edit this goal." };
  }
  // Shared-recipient copies: only weightage is editable, but it's editable
  // regardless of state — the brief explicitly grants this to recipients.
  const isSharedRecipient = !!g.sharedSourceId;
  if (isSharedRecipient && !isAdmin) {
    const allowed = new Set(["weightage"]);
    for (const k of Object.keys(patch)) {
      if (!allowed.has(k)) return { ok: false, error: "Shared goal title/target are read-only." };
    }
    if (!isOwner) return { ok: false, error: "Only the recipient can adjust their own weightage." };
    // Skip the locked-state check below for this allowed edit.
  } else {
    // Locked goals: only admin can edit, and an audit row is written.
    const wasLocked = g.state === "approved";
    if (wasLocked && !isAdmin) {
      return { ok: false, error: "Goal is locked. Ask an Admin to unlock it." };
    }
    // While submitted, manager can adjust inline (per brief).
    if (g.state === "submitted" && !isManagerForOwner && !isAdmin) {
      return { ok: false, error: "Submitted goals can only be edited by the reviewing manager or Admin." };
    }
  }
  const wasLocked = g.state === "approved";
  const before = { ...g };
  Object.assign(g, patch);
  g.updatedAt = now();
  saveDB(db);
  logAudit({
    actorId: user.id, action: "goal_updated", targetType: "goal", targetId: g.id,
    afterLock: wasLocked, before, after: { ...g },
  });
  revalidatePath("/goals");
  revalidatePath("/approvals");
  return { ok: true };
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDB();
  const g = db.goals.find((g) => g.id === id);
  if (!g) return { ok: false, error: "Goal not found." };
  if (g.state === "approved" && user.role !== "admin") {
    return { ok: false, error: "Locked goals can only be removed by an Admin." };
  }
  if (g.ownerId !== user.id && user.role !== "admin") {
    return { ok: false, error: "You can't remove this goal." };
  }
  const before = { ...g };
  db.goals = db.goals.filter((x) => x.id !== id);
  saveDB(db);
  logAudit({ actorId: user.id, action: "goal_deleted", targetType: "goal", targetId: g.id, before, afterLock: before.state === "approved" });
  revalidatePath("/goals");
  return { ok: true };
}

export async function submitSheetAction(): Promise<ActionResult> {
  const user = await requireUser();
  const cycle = getActiveCycle();
  if (goalSettingState(cycle) === "passed") {
    return { ok: false, error: "Goal setting window has closed for the current cycle." };
  }
  const db = getDB();
  const sheet = db.goals.filter((g) => g.ownerId === user.id && g.cycleId === cycle.id);
  const v = validateSheet(sheet);
  if (!v.ok) return { ok: false, error: v.blockers[0] };
  for (const g of sheet) {
    if (g.state === "draft" || g.state === "returned") {
      g.state = "submitted";
      g.submittedAt = now();
      g.updatedAt = now();
      logAudit({ actorId: user.id, action: "goal_submitted", targetType: "goal", targetId: g.id });
    }
  }
  saveDB(db);
  const manager = db.users.find((u) => u.id === user.managerId);
  if (manager) {
    notify({
      toUserId: manager.id, channel: "email", kind: "goal_submitted",
      title: `${user.name} submitted their goal sheet`,
      body: `${user.name} submitted ${sheet.length} goal(s) for ${cycle.name}. Review and approve in the Approvals queue.`,
      deepLink: "/approvals",
    });
    notify({
      toUserId: manager.id, channel: "teams", kind: "goal_submitted",
      title: `Teams card · ${user.name} submitted goals`,
      body: `Open the deep-link below to review and approve.`,
      deepLink: "/approvals",
    });
  }
  revalidatePath("/goals");
  revalidatePath("/approvals");
  return { ok: true };
}

export async function approveSheetAction(ownerId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "manager" && user.role !== "admin") return { ok: false, error: "Only managers can approve goal sheets." };
  const db = getDB();
  const owner = db.users.find((u) => u.id === ownerId);
  if (!owner) return { ok: false, error: "Owner not found." };
  if (user.role === "manager" && owner.managerId !== user.id) return { ok: false, error: "You can only approve goals from your direct reports." };
  const cycle = getActiveCycle();
  const sheet = db.goals.filter((g) => g.ownerId === ownerId && g.cycleId === cycle.id);
  const submitted = sheet.filter((g) => g.state === "submitted");
  if (submitted.length === 0) return { ok: false, error: "No submitted goals to approve." };
  const v = validateSheet(sheet);
  if (!v.ok) return { ok: false, error: v.blockers[0] };
  for (const g of submitted) {
    g.state = "approved";
    g.approvedAt = now();
    g.updatedAt = now();
    logAudit({ actorId: user.id, action: "goal_approved", targetType: "goal", targetId: g.id });
  }
  saveDB(db);
  notify({
    toUserId: owner.id, channel: "email", kind: "goal_approved",
    title: `Your goals were approved`,
    body: `${user.name} approved your ${cycle.name} goal sheet. Goals are now locked.`,
    deepLink: "/goals",
  });
  revalidatePath("/approvals");
  revalidatePath("/goals");
  return { ok: true };
}

export async function returnSheetAction(ownerId: string, reason: string): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "manager" && user.role !== "admin") return { ok: false, error: "Only managers can return goal sheets." };
  if (!reason || reason.trim().length < 3) return { ok: false, error: "Provide a brief reason so the employee knows what to change." };
  const db = getDB();
  const owner = db.users.find((u) => u.id === ownerId);
  if (!owner) return { ok: false, error: "Owner not found." };
  if (user.role === "manager" && owner.managerId !== user.id) return { ok: false, error: "You can only return goals from your direct reports." };
  const cycle = getActiveCycle();
  const submitted = db.goals.filter((g) => g.ownerId === ownerId && g.cycleId === cycle.id && g.state === "submitted");
  if (submitted.length === 0) return { ok: false, error: "Nothing submitted to return." };
  for (const g of submitted) {
    g.state = "returned";
    g.returnedAt = now();
    g.returnReason = reason.trim();
    g.updatedAt = now();
    logAudit({ actorId: user.id, action: "goal_returned", targetType: "goal", targetId: g.id, note: reason.trim() });
  }
  saveDB(db);
  notify({
    toUserId: owner.id, channel: "email", kind: "goal_returned",
    title: `Your goals were returned for rework`,
    body: `${user.name} returned your sheet: "${reason.trim()}"`,
    deepLink: "/goals",
  });
  revalidatePath("/approvals");
  revalidatePath("/goals");
  return { ok: true };
}

export async function unlockGoalAction(id: string, reason: string): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "admin") return { ok: false, error: "Only Admin can unlock locked goals." };
  if (!reason || reason.trim().length < 3) return { ok: false, error: "Provide a reason for the audit trail." };
  const db = getDB();
  const g = db.goals.find((g) => g.id === id);
  if (!g) return { ok: false, error: "Goal not found." };
  if (g.state !== "approved") return { ok: false, error: "Only approved goals can be unlocked." };
  const before = { ...g };
  g.state = "unlocked";
  g.updatedAt = now();
  saveDB(db);
  logAudit({
    actorId: user.id, action: "goal_unlocked", targetType: "goal", targetId: g.id,
    before, after: { ...g }, note: reason.trim(), afterLock: true,
  });
  revalidatePath("/admin/audit");
  revalidatePath("/goals");
  return { ok: true };
}

export async function saveCheckinAction(goalId: string, quarter: Quarter, patch: { actual?: string; status?: GoalStatus }): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDB();
  const g = db.goals.find((g) => g.id === goalId);
  if (!g) return { ok: false, error: "Goal not found." };
  // For shared recipient copies, achievement is owned by the primary's owner.
  if (g.sharedSourceId && g.ownerId !== user.id && user.role !== "admin") {
    return { ok: false, error: "Shared goal achievement is updated by the primary owner." };
  }
  if (g.ownerId !== user.id && user.role !== "admin") return { ok: false, error: "You can't update this goal." };
  if (g.state !== "approved" && g.state !== "unlocked") return { ok: false, error: "Goal must be approved before check-ins can be logged." };
  const before = JSON.parse(JSON.stringify(g.checkins));
  const existing = g.checkins[quarter] ?? {};
  g.checkins[quarter] = {
    ...existing,
    ...patch,
    updatedAt: now(),
  };
  g.updatedAt = now();
  saveDB(db);
  logAudit({ actorId: user.id, action: "checkin_updated", targetType: "goal", targetId: g.id, before, after: g.checkins, note: quarter });
  // Sync to shared copies if this is the primary
  if (g.sharedPrimary) syncSharedAchievement(g.id);
  // Notify manager of an update on their team
  const owner = db.users.find((u) => u.id === g.ownerId);
  if (owner?.managerId && owner.managerId !== user.id) {
    notify({
      toUserId: owner.managerId, channel: "in_app", kind: "checkin_received",
      title: `${owner.name} updated a ${quarter} check-in`,
      body: `"${g.title}" — new ${quarter} actual / status logged.`,
      deepLink: "/team",
    });
  }
  revalidatePath("/checkins");
  revalidatePath("/team");
  return { ok: true };
}

export async function managerCommentAction(goalId: string, quarter: Quarter, comment: string): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "manager" && user.role !== "admin") return { ok: false, error: "Only managers can comment on check-ins." };
  const db = getDB();
  const g = db.goals.find((g) => g.id === goalId);
  if (!g) return { ok: false, error: "Goal not found." };
  const owner = db.users.find((u) => u.id === g.ownerId);
  if (user.role === "manager" && owner?.managerId !== user.id) return { ok: false, error: "Not your direct report." };
  const before = JSON.parse(JSON.stringify(g.checkins));
  const existing = g.checkins[quarter] ?? {};
  g.checkins[quarter] = {
    ...existing,
    managerComment: comment.trim(),
    managerCommentAt: now(),
    managerCommentBy: user.id,
  };
  g.updatedAt = now();
  saveDB(db);
  logAudit({ actorId: user.id, action: "manager_comment", targetType: "goal", targetId: g.id, before, after: g.checkins, note: `${quarter}: ${comment.trim().slice(0, 80)}` });
  if (owner) {
    notify({
      toUserId: owner.id, channel: "email", kind: "info",
      title: `Manager comment on ${quarter} check-in`,
      body: `${user.name} added a comment on "${g.title}".`,
      deepLink: "/checkins",
    });
  }
  revalidatePath("/team");
  revalidatePath("/checkins");
  return { ok: true };
}

