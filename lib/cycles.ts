import { getDB, now } from "./db";
import type { Cycle, Quarter } from "./types";

export function getActiveCycle(): Cycle {
  const db = getDB();
  const active = db.cycles.find((c) => c.active);
  if (active) return active;
  return db.cycles[0];
}

export function getCycle(id: string): Cycle | undefined {
  return getDB().cycles.find((c) => c.id === id);
}

export type WindowState = "not_open" | "open" | "passed";

// Goal setting opens at goalSettingOpens and closes when q1 opens.
export function goalSettingState(cycle: Cycle): WindowState {
  const t = new Date(now()).getTime();
  if (t < new Date(cycle.goalSettingOpens).getTime()) return "not_open";
  if (t >= new Date(cycle.q1Opens).getTime()) return "passed";
  return "open";
}

// A quarterly check-in window is "open" once that quarter starts and stays
// open until the next quarter starts (Q4 stays open through cycle end).
export function quarterState(cycle: Cycle, q: Quarter): WindowState {
  const map: Record<Quarter, string> = {
    Q1: cycle.q1Opens,
    Q2: cycle.q2Opens,
    Q3: cycle.q3Opens,
    Q4: cycle.q4Opens,
  };
  const order: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];
  const idx = order.indexOf(q);
  const start = new Date(map[q]).getTime();
  const t = new Date(now()).getTime();
  if (t < start) return "not_open";
  if (idx < 3) {
    const nextStart = new Date(map[order[idx + 1]]).getTime();
    if (t >= nextStart) return "passed";
  }
  return "open";
}

export function activeQuarter(cycle: Cycle): Quarter | null {
  for (const q of ["Q4", "Q3", "Q2", "Q1"] as Quarter[]) {
    if (quarterState(cycle, q) === "open") return q;
  }
  return null;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return iso; }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}
