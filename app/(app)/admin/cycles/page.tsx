import { requireRole } from "@/lib/auth";
import { getDB } from "@/lib/db";
import CyclesClient from "./CyclesClient";

export default async function CyclesPage() {
  await requireRole("admin");
  const db = getDB();
  return <CyclesClient cycles={db.cycles} clockOffsetDays={Math.round((db.clockOffsetMs ?? 0) / 86_400_000)} />;
}
