import type { Goal, Quarter } from "./types";

// Returns 0-100 progress score per the brief's formulas, or null if not computable.
export function scoreFor(goal: Goal, quarter: Quarter): number | null {
  const checkin = goal.checkins[quarter];
  if (!checkin?.actual) return null;
  const actualStr = checkin.actual.trim();
  if (!actualStr) return null;

  switch (goal.uom) {
    case "min": {
      const a = Number(actualStr);
      const t = Number(goal.target);
      if (!isFinite(a) || !isFinite(t) || t === 0) return null;
      return clamp((a / t) * 100);
    }
    case "max": {
      const a = Number(actualStr);
      const t = Number(goal.target);
      if (!isFinite(a) || !isFinite(t) || a === 0) return null;
      return clamp((t / a) * 100);
    }
    case "timeline": {
      const deadline = new Date(goal.target);
      const completion = new Date(actualStr);
      if (isNaN(deadline.getTime()) || isNaN(completion.getTime())) return null;
      // On or before deadline = 100; each day late drops 5 points (floored at 0).
      const daysLate = Math.max(0, Math.floor((completion.getTime() - deadline.getTime()) / 86_400_000));
      return clamp(100 - daysLate * 5);
    }
    case "zero": {
      const a = Number(actualStr);
      if (!isFinite(a)) return null;
      return a === 0 ? 100 : 0;
    }
  }
}

function clamp(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n * 10) / 10;
}

// Latest checkin quarter that has data (Q4 > Q3 > Q2 > Q1).
export function latestQuarterWithData(goal: Goal): Quarter | null {
  const order: Quarter[] = ["Q4", "Q3", "Q2", "Q1"];
  for (const q of order) {
    if (goal.checkins[q]?.actual || goal.checkins[q]?.status) return q;
  }
  return null;
}

// Weighted overall achievement for a sheet at a given quarter.
export function overallAchievement(goals: Goal[], quarter: Quarter): number | null {
  const considered = goals.filter((g) => g.state === "approved" || g.state === "unlocked");
  if (considered.length === 0) return null;
  let totalWeighted = 0;
  let totalWeight = 0;
  for (const g of considered) {
    const s = scoreFor(g, quarter);
    if (s == null) continue;
    totalWeighted += (s * g.weightage) / 100;
    totalWeight += g.weightage;
  }
  if (totalWeight === 0) return null;
  return Math.round((totalWeighted / totalWeight) * 1000) / 10;
}
