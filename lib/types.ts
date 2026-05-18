export type Role = "employee" | "manager" | "admin";

export type UoM = "min" | "max" | "timeline" | "zero";
export const UoMLabel: Record<UoM, string> = {
  min: "Numeric / % — Higher is better",
  max: "Numeric / % — Lower is better",
  timeline: "Timeline (date)",
  zero: "Zero-based (0 = success)",
};

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
export type GoalStatus = "not_started" | "on_track" | "completed";
export type GoalState =
  | "draft"
  | "submitted"
  | "returned"
  | "approved" // locked
  | "unlocked"; // re-opened by admin

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // plain in seed for demo; would be hashed in prod
  role: Role;
  managerId?: string; // L1 manager
  department: string;
  designation: string;
  avatarColor: string;
}

export interface ThrustArea {
  id: string;
  name: string;
  description?: string;
}

export interface Cycle {
  id: string;
  name: string; // e.g., "FY 2026-27"
  active: boolean;
  // ISO date strings; windows open from this date onward (no hard close in the brief)
  goalSettingOpens: string; // 1st May
  q1Opens: string;          // July 1
  q2Opens: string;          // October 1
  q3Opens: string;          // January 1
  q4Opens: string;          // March 1 (Annual / Final)
}

export interface CheckIn {
  actual?: string;            // raw text (number or date)
  status?: GoalStatus;
  updatedAt?: string;
  managerComment?: string;
  managerCommentAt?: string;
  managerCommentBy?: string;
}

export interface Goal {
  id: string;
  cycleId: string;
  ownerId: string;            // employee whose sheet this lives on
  thrustAreaId: string;
  title: string;
  description: string;
  uom: UoM;
  target: string;             // raw text — interpreted per UoM
  weightage: number;          // 0-100, min 10
  state: GoalState;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  returnedAt?: string;
  returnReason?: string;
  // Shared goals
  isShared?: boolean;
  sharedSourceId?: string;    // if this is a recipient copy, points to primary
  sharedPrimary?: boolean;    // true on the owner's copy that drives achievement
  checkins: Partial<Record<Quarter, CheckIn>>;
}

export type AuditAction =
  | "goal_created"
  | "goal_updated"
  | "goal_submitted"
  | "goal_returned"
  | "goal_approved"
  | "goal_unlocked"
  | "goal_deleted"
  | "checkin_updated"
  | "manager_comment"
  | "shared_goal_pushed"
  | "weightage_adjusted"
  | "user_created"
  | "user_updated"
  | "cycle_updated"
  | "escalation_triggered";

export interface AuditLog {
  id: string;
  at: string;
  actorId: string;
  action: AuditAction;
  targetType: "goal" | "user" | "cycle" | "escalation";
  targetId: string;
  // afterLock=true is critical for the brief's audit requirement
  afterLock?: boolean;
  before?: unknown;
  after?: unknown;
  note?: string;
}

export interface Notification {
  id: string;
  at: string;
  toUserId: string;
  kind:
    | "goal_submitted"
    | "goal_approved"
    | "goal_returned"
    | "checkin_reminder"
    | "checkin_received"
    | "shared_goal_received"
    | "escalation"
    | "info";
  title: string;
  body: string;
  deepLink?: string;
  read?: boolean;
  channel: "email" | "teams" | "in_app";
}

export type EscalationTrigger =
  | "no_submission"
  | "no_approval"
  | "no_checkin";

export interface EscalationRule {
  id: string;
  name: string;
  trigger: EscalationTrigger;
  thresholdDays: number;
  notifyEmployee: boolean;
  notifyManager: boolean;
  notifyHR: boolean;
  enabled: boolean;
}

export interface EscalationLog {
  id: string;
  at: string;
  ruleId: string;
  targetUserId: string;
  message: string;
  resolved?: boolean;
}

export interface DB {
  users: User[];
  thrustAreas: ThrustArea[];
  cycles: Cycle[];
  goals: Goal[];
  audit: AuditLog[];
  notifications: Notification[];
  escalationRules: EscalationRule[];
  escalationLogs: EscalationLog[];
  // demo time-override (in ms); lets admins demo different cycle windows
  clockOffsetMs?: number;
}
