import { requireRole } from "@/lib/auth";
import { getActiveCycle } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import SharedGoalsClient from "./SharedGoalsClient";

export default async function SharedGoalsPage() {
  const me = await requireRole("manager", "admin");
  const cycle = getActiveCycle();
  const db = getDB();

  // Recipients available: admin sees all employees; manager sees direct reports.
  const recipients = db.users.filter((u) =>
    me.role === "admin" ? u.role === "employee" : u.managerId === me.id,
  );
  const primaries = db.goals
    .filter((g) => g.cycleId === cycle.id && g.sharedPrimary)
    .map((p) => ({
      primary: p,
      ownerName: db.users.find((u) => u.id === p.ownerId)?.name ?? p.ownerId,
      copies: db.goals.filter((g) => g.sharedSourceId === p.id),
    }));

  return (
    <SharedGoalsClient
      cycleName={cycle.name}
      thrustAreas={db.thrustAreas}
      users={db.users}
      recipients={recipients}
      existing={primaries}
      asAdmin={me.role === "admin"}
    />
  );
}
