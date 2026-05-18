import { requireRole } from "@/lib/auth";
import { activeQuarter, getActiveCycle, quarterState } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import type { Quarter } from "@/lib/types";
import TeamClient from "./TeamClient";

export default async function TeamPage() {
  const me = await requireRole("manager", "admin");
  const cycle = getActiveCycle();
  const db = getDB();
  const reports = db.users.filter((u) =>
    me.role === "admin" ? u.role === "employee" : u.managerId === me.id,
  );
  const data = reports.map((emp) => ({
    employee: emp,
    goals: db.goals
      .filter((g) => g.ownerId === emp.id && g.cycleId === cycle.id && (g.state === "approved" || g.state === "unlocked"))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  }));
  const aq = activeQuarter(cycle);
  const states: Record<Quarter, "not_open" | "open" | "passed"> = {
    Q1: quarterState(cycle, "Q1"),
    Q2: quarterState(cycle, "Q2"),
    Q3: quarterState(cycle, "Q3"),
    Q4: quarterState(cycle, "Q4"),
  };
  return <TeamClient data={data} thrustAreas={db.thrustAreas} cycleName={cycle.name} activeQ={aq} quarterStates={states} />;
}
