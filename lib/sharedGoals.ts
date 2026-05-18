import { getDB, newId, now, saveDB } from "./db";
import { logAudit } from "./audit";
import { notify } from "./notify";
import type { Goal, GoalState, UoM } from "./types";

export interface SharedPush {
  actorId: string;
  cycleId: string;
  primaryOwnerId: string;        // who owns the source/master copy
  thrustAreaId: string;
  title: string;
  description: string;
  uom: UoM;
  target: string;
  weightage: number;              // default per recipient (each can adjust)
  recipientIds: string[];         // employees who receive a linked copy
  recipientWeightages?: Record<string, number>;
}

export function pushSharedGoal(input: SharedPush): { primary: Goal; copies: Goal[] } {
  const db = getDB();
  const t = now();
  const primary: Goal = {
    id: newId("g"),
    cycleId: input.cycleId,
    ownerId: input.primaryOwnerId,
    thrustAreaId: input.thrustAreaId,
    title: input.title,
    description: input.description,
    uom: input.uom,
    target: input.target,
    weightage: input.weightage,
    state: "approved" as GoalState, // shared/admin-pushed goals are locked-in for recipients
    createdAt: t,
    updatedAt: t,
    submittedAt: t,
    approvedAt: t,
    isShared: true,
    sharedPrimary: true,
    checkins: {},
  };
  db.goals.push(primary);
  logAudit({
    actorId: input.actorId,
    action: "shared_goal_pushed",
    targetType: "goal",
    targetId: primary.id,
    after: primary,
    note: `Pushed to ${input.recipientIds.length} recipient(s).`,
  });

  const copies: Goal[] = [];
  for (const rid of input.recipientIds) {
    const w = input.recipientWeightages?.[rid] ?? input.weightage;
    const copy: Goal = {
      ...primary,
      id: newId("g"),
      ownerId: rid,
      weightage: w,
      sharedPrimary: false,
      sharedSourceId: primary.id,
    };
    db.goals.push(copy);
    copies.push(copy);
    notify({
      toUserId: rid,
      channel: "in_app",
      kind: "shared_goal_received",
      title: "A shared goal was added to your sheet",
      body: `"${primary.title}" was pushed by ${db.users.find((u) => u.id === input.actorId)?.name ?? "your org"}. You can adjust your weightage but not the title or target.`,
      deepLink: "/goals",
    });
  }
  saveDB(db);
  return { primary, copies };
}

// When the primary's checkins are updated, mirror to all linked copies.
export function syncSharedAchievement(primaryId: string): void {
  const db = getDB();
  const primary = db.goals.find((g) => g.id === primaryId);
  if (!primary || !primary.sharedPrimary) return;
  for (const g of db.goals) {
    if (g.sharedSourceId !== primary.id) continue;
    g.checkins = JSON.parse(JSON.stringify(primary.checkins));
    g.updatedAt = now();
  }
  saveDB(db);
}
