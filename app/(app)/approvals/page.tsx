import { requireRole } from "@/lib/auth";
import { getActiveCycle } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import { validateSheet } from "@/lib/validation";
import ApprovalsClient from "./ApprovalsClient";

export default async function ApprovalsPage() {
  const me = await requireRole("manager", "admin");
  const cycle = getActiveCycle();
  const db = getDB();
  const reports = db.users.filter((u) =>
    me.role === "admin" ? u.role === "employee" : u.managerId === me.id,
  );
  const sheets = reports.map((emp) => {
    const goals = db.goals
      .filter((g) => g.ownerId === emp.id && g.cycleId === cycle.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return {
      employee: emp,
      goals,
      validation: validateSheet(goals),
      anySubmitted: goals.some((g) => g.state === "submitted"),
      allApproved: goals.length > 0 && goals.every((g) => g.state === "approved"),
    };
  });
  return <ApprovalsClient sheets={sheets} thrustAreas={db.thrustAreas} cycleName={cycle.name} />;
}
