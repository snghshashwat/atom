import { requireRole } from "@/lib/auth";
import { toCSV } from "@/lib/csv";
import { getActiveCycle } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import { scoreFor } from "@/lib/scoring";
import type { Quarter } from "@/lib/types";

const QS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export async function GET() {
  await requireRole("manager", "admin");
  const cycle = getActiveCycle();
  const db = getDB();
  const rows: Array<Record<string, string | number>> = [];
  for (const g of db.goals) {
    if (g.cycleId !== cycle.id) continue;
    const owner = db.users.find((u) => u.id === g.ownerId);
    if (!owner) continue;
    const ta = db.thrustAreas.find((t) => t.id === g.thrustAreaId)?.name ?? g.thrustAreaId;
    const row: Record<string, string | number> = {
      Cycle: cycle.name,
      Employee: owner.name,
      Email: owner.email,
      Department: owner.department,
      Designation: owner.designation,
      "Thrust Area": ta,
      "Goal Title": g.title,
      Description: g.description,
      UoM: g.uom,
      Target: g.target,
      "Weightage %": g.weightage,
      State: g.state,
    };
    for (const q of QS) {
      const c = g.checkins[q] ?? {};
      row[`${q} Actual`] = c.actual ?? "";
      row[`${q} Status`] = c.status ?? "";
      const s = scoreFor(g, q);
      row[`${q} Score %`] = s == null ? "" : s;
      row[`${q} Manager Comment`] = c.managerComment ?? "";
    }
    rows.push(row);
  }
  const csv = toCSV(rows);
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="achievement-report-${cycle.name.replace(/\s+/g, "_")}.csv"`,
    },
  });
}
