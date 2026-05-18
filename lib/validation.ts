import type { Goal, UoM } from "./types";

export const MAX_GOALS_PER_EMPLOYEE = 8;
export const MIN_WEIGHTAGE = 10;
export const TOTAL_WEIGHTAGE = 100;

export interface GoalDraft {
  thrustAreaId: string;
  title: string;
  description: string;
  uom: UoM;
  target: string;
  weightage: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  fieldErrors: Partial<Record<keyof GoalDraft | "global", string>>;
}

export function validateGoalDraft(d: GoalDraft): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: ValidationResult["fieldErrors"] = {};

  if (!d.thrustAreaId) { fieldErrors.thrustAreaId = "Pick a thrust area"; errors.push("Thrust area is required."); }
  if (!d.title || d.title.trim().length < 3) { fieldErrors.title = "At least 3 characters"; errors.push("Goal title is required."); }
  if (!d.target || !d.target.trim()) { fieldErrors.target = "Target is required"; errors.push("Target is required."); }
  if (d.uom === "timeline" && d.target) {
    const t = new Date(d.target);
    if (isNaN(t.getTime())) { fieldErrors.target = "Use a valid date"; errors.push("Timeline targets must be a date."); }
  }
  if (d.uom === "zero" && d.target.trim() !== "0") {
    fieldErrors.target = "Zero-based goals must have target 0";
    errors.push("Zero-based goals must have target = 0.");
  }
  if (!Number.isFinite(d.weightage)) { fieldErrors.weightage = "Weightage required"; errors.push("Weightage is required."); }
  if (d.weightage < MIN_WEIGHTAGE) {
    fieldErrors.weightage = `Minimum ${MIN_WEIGHTAGE}%`;
    errors.push(`Per-goal weightage must be at least ${MIN_WEIGHTAGE}%.`);
  }
  if (d.weightage > 100) {
    fieldErrors.weightage = "Maximum 100%";
    errors.push("Per-goal weightage cannot exceed 100%.");
  }

  return { ok: errors.length === 0, errors, fieldErrors };
}

export interface SheetValidation {
  ok: boolean;
  warnings: string[];
  blockers: string[];
  totalWeightage: number;
  count: number;
}

// Pre-submission rules: total = 100, max 8 goals, each >= 10%.
export function validateSheet(goals: Goal[]): SheetValidation {
  const warnings: string[] = [];
  const blockers: string[] = [];
  const total = goals.reduce((sum, g) => sum + (g.weightage || 0), 0);
  if (goals.length === 0) blockers.push("Add at least one goal before submitting.");
  if (goals.length > MAX_GOALS_PER_EMPLOYEE) blockers.push(`A goal sheet can have at most ${MAX_GOALS_PER_EMPLOYEE} goals.`);
  if (total !== TOTAL_WEIGHTAGE) blockers.push(`Total weightage must equal ${TOTAL_WEIGHTAGE}% (currently ${total}%).`);
  for (const g of goals) {
    if (g.weightage < MIN_WEIGHTAGE) blockers.push(`"${g.title}" is below the ${MIN_WEIGHTAGE}% minimum.`);
  }
  return { ok: blockers.length === 0, warnings, blockers, totalWeightage: total, count: goals.length };
}
