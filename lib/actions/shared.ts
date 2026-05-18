"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getActiveCycle } from "@/lib/cycles";
import { pushSharedGoal } from "@/lib/sharedGoals";
import type { UoM } from "@/lib/types";

export interface PushInput {
  primaryOwnerId: string;
  thrustAreaId: string;
  title: string;
  description: string;
  uom: UoM;
  target: string;
  weightage: number;
  recipientIds: string[];
}

export async function pushSharedGoalAction(input: PushInput): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole("manager", "admin");
  if (!input.primaryOwnerId || !input.recipientIds || input.recipientIds.length === 0) {
    return { ok: false, error: "Pick a primary owner and at least one recipient." };
  }
  if (!input.title || input.title.trim().length < 3) return { ok: false, error: "Title is required." };
  if (!input.target.trim()) return { ok: false, error: "Target is required." };
  if (!Number.isFinite(input.weightage) || input.weightage < 10 || input.weightage > 100) {
    return { ok: false, error: "Weightage must be between 10 and 100." };
  }
  const cycle = getActiveCycle();
  pushSharedGoal({
    actorId: user.id,
    cycleId: cycle.id,
    primaryOwnerId: input.primaryOwnerId,
    thrustAreaId: input.thrustAreaId,
    title: input.title.trim(),
    description: input.description.trim(),
    uom: input.uom,
    target: input.target.trim(),
    weightage: input.weightage,
    recipientIds: input.recipientIds,
  });
  revalidatePath("/shared-goals");
  revalidatePath("/goals");
  return { ok: true };
}
