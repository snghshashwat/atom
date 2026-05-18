import { requireUser } from "@/lib/auth";
import { activeQuarter, getActiveCycle, quarterState } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import type { Quarter } from "@/lib/types";
import CheckinsClient from "./CheckinsClient";

export default async function CheckinsPage() {
  const user = await requireUser();
  const cycle = getActiveCycle();
  const db = getDB();
  const goals = db.goals
    .filter((g) => g.ownerId === user.id && g.cycleId === cycle.id && (g.state === "approved" || g.state === "unlocked"))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const aq = activeQuarter(cycle);
  const states: Record<Quarter, "not_open" | "open" | "passed"> = {
    Q1: quarterState(cycle, "Q1"),
    Q2: quarterState(cycle, "Q2"),
    Q3: quarterState(cycle, "Q3"),
    Q4: quarterState(cycle, "Q4"),
  };
  return (
    <CheckinsClient
      goals={goals}
      thrustAreas={db.thrustAreas}
      cycleName={cycle.name}
      activeQ={aq}
      quarterStates={states}
    />
  );
}
