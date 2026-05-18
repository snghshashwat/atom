import { requireUser } from "@/lib/auth";
import { getActiveCycle, goalSettingState } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import { validateSheet } from "@/lib/validation";
import GoalSheetClient from "./GoalSheetClient";

export default async function GoalsPage() {
  const user = await requireUser();
  const cycle = getActiveCycle();
  const db = getDB();
  const myGoals = db.goals
    .filter((g) => g.ownerId === user.id && g.cycleId === cycle.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const v = validateSheet(myGoals);
  const settingState = goalSettingState(cycle);
  const reason = myGoals.find((g) => g.state === "returned")?.returnReason ?? null;

  return (
    <GoalSheetClient
      initialGoals={myGoals}
      thrustAreas={db.thrustAreas}
      cycleName={cycle.name}
      settingOpen={settingState === "open"}
      initialValidation={v}
      returnReason={reason}
      isAdmin={user.role === "admin"}
    />
  );
}
