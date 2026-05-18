import type {
  Cycle,
  DB,
  EscalationRule,
  Goal,
  ThrustArea,
  User,
} from "./types";

// Seed an active FY cycle that starts today minus a few days,
// so the "Phase 1 — Goal Setting" window is open out of the box.
function buildCycle(): Cycle {
  const today = new Date();
  const year = today.getFullYear();
  // Goal setting opened 7 days ago for demo realism
  const opens = new Date(today);
  opens.setDate(opens.getDate() - 7);
  // Quarterly checkpoints opened progressively in past, future
  const q1 = new Date(opens); q1.setMonth(q1.getMonth() + 2);
  const q2 = new Date(opens); q2.setMonth(q2.getMonth() + 5);
  const q3 = new Date(opens); q3.setMonth(q3.getMonth() + 8);
  const q4 = new Date(opens); q4.setMonth(q4.getMonth() + 11);
  return {
    id: "cycle-current",
    name: `FY ${year}-${(year + 1).toString().slice(2)}`,
    active: true,
    goalSettingOpens: opens.toISOString(),
    q1Opens: q1.toISOString(),
    q2Opens: q2.toISOString(),
    q3Opens: q3.toISOString(),
    q4Opens: q4.toISOString(),
  };
}

const thrustAreas: ThrustArea[] = [
  { id: "ta-revenue", name: "Revenue Growth", description: "Top-line revenue and new business acquisition" },
  { id: "ta-cost", name: "Cost & Efficiency", description: "Cost optimization, operating margin, TAT" },
  { id: "ta-people", name: "People & Culture", description: "Employee engagement, retention, learning" },
  { id: "ta-customer", name: "Customer Experience", description: "NPS, CSAT, support quality" },
  { id: "ta-innovation", name: "Innovation & Product", description: "New launches, feature delivery, R&D" },
  { id: "ta-compliance", name: "Compliance & Safety", description: "Audit, safety, regulatory adherence" },
];

const users: User[] = [
  // Admin / HR
  { id: "u-admin", name: "Priya Iyer", email: "admin@atom.dev", password: "admin", role: "admin", department: "Human Resources", designation: "Head of HR", avatarColor: "#7c3aed" },
  // Managers (L1)
  { id: "u-mgr-sales", name: "Rohan Mehta", email: "rohan@atom.dev", password: "manager", role: "manager", department: "Sales", designation: "VP, Sales", avatarColor: "#0ea5e9" },
  { id: "u-mgr-eng", name: "Anita Rao", email: "anita@atom.dev", password: "manager", role: "manager", department: "Engineering", designation: "Director, Engineering", avatarColor: "#10b981" },
  // Employees
  { id: "u-emp-1", name: "Karthik Nair", email: "karthik@atom.dev", password: "employee", role: "employee", managerId: "u-mgr-sales", department: "Sales", designation: "Account Executive", avatarColor: "#f59e0b" },
  { id: "u-emp-2", name: "Sneha Patel", email: "sneha@atom.dev", password: "employee", role: "employee", managerId: "u-mgr-sales", department: "Sales", designation: "Senior AE", avatarColor: "#ef4444" },
  { id: "u-emp-3", name: "Arjun Verma", email: "arjun@atom.dev", password: "employee", role: "employee", managerId: "u-mgr-eng", department: "Engineering", designation: "Staff Engineer", avatarColor: "#06b6d4" },
  { id: "u-emp-4", name: "Meera Kapoor", email: "meera@atom.dev", password: "employee", role: "employee", managerId: "u-mgr-eng", department: "Engineering", designation: "Engineering Manager", avatarColor: "#a855f7" },
];

const escalationRules: EscalationRule[] = [
  { id: "esc-1", name: "Employee hasn't submitted goals in 14 days", trigger: "no_submission", thresholdDays: 14, notifyEmployee: true, notifyManager: true, notifyHR: false, enabled: true },
  { id: "esc-2", name: "Manager hasn't approved goals in 7 days", trigger: "no_approval", thresholdDays: 7, notifyEmployee: true, notifyManager: true, notifyHR: true, enabled: true },
  { id: "esc-3", name: "Check-in missed (no update in 30 days of window)", trigger: "no_checkin", thresholdDays: 30, notifyEmployee: true, notifyManager: true, notifyHR: true, enabled: true },
];

// A handful of pre-existing goals so the manager has something to approve
// and check-in dashboards have content on first load.
function buildSeedGoals(cycleId: string): Goal[] {
  const now = new Date().toISOString();
  const earlier = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  return [
    // Sneha's already-submitted sheet awaiting approval
    {
      id: "g-sneha-1", cycleId, ownerId: "u-emp-2", thrustAreaId: "ta-revenue",
      title: "Achieve quarterly sales quota", description: "Close $1.2M in new ARR for FY",
      uom: "min", target: "1200000", weightage: 50, state: "submitted",
      createdAt: earlier, updatedAt: earlier, submittedAt: earlier, checkins: {},
    },
    {
      id: "g-sneha-2", cycleId, ownerId: "u-emp-2", thrustAreaId: "ta-customer",
      title: "Maintain CSAT above 90%", description: "Sustain post-sale CSAT for owned accounts",
      uom: "min", target: "90", weightage: 25, state: "submitted",
      createdAt: earlier, updatedAt: earlier, submittedAt: earlier, checkins: {},
    },
    {
      id: "g-sneha-3", cycleId, ownerId: "u-emp-2", thrustAreaId: "ta-compliance",
      title: "Zero compliance breaches", description: "No regulatory or contractual breaches",
      uom: "zero", target: "0", weightage: 25, state: "submitted",
      createdAt: earlier, updatedAt: earlier, submittedAt: earlier, checkins: {},
    },
    // Arjun's already-approved sheet so check-in UI has content
    {
      id: "g-arjun-1", cycleId, ownerId: "u-emp-3", thrustAreaId: "ta-innovation",
      title: "Ship Payments v2 module", description: "Complete Payments v2 by end of Q3",
      uom: "timeline", target: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      weightage: 60, state: "approved",
      createdAt: earlier, updatedAt: earlier, submittedAt: earlier, approvedAt: now,
      checkins: { Q1: { actual: "On track — design complete", status: "on_track", updatedAt: now } },
    },
    {
      id: "g-arjun-2", cycleId, ownerId: "u-emp-3", thrustAreaId: "ta-cost",
      title: "Reduce p95 latency", description: "Bring p95 API latency below 200ms",
      uom: "max", target: "200", weightage: 40, state: "approved",
      createdAt: earlier, updatedAt: earlier, submittedAt: earlier, approvedAt: now,
      checkins: {},
    },
  ];
}

function buildSeedNotifications(): DB["notifications"] {
  const now = new Date();
  const t = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60 * 1000).toISOString();
  return [
    {
      id: "ntf-seed-1", at: t(5), toUserId: "u-mgr-sales", kind: "goal_submitted",
      title: "Goal sheet submitted", body: "Sneha Patel has submitted her goal sheet for your review. 3 goals totalling 100% weightage are pending approval.",
      deepLink: "/approvals", read: false, channel: "email",
    },
    {
      id: "ntf-seed-2", at: t(5), toUserId: "u-mgr-sales", kind: "goal_submitted",
      title: "Sneha Patel submitted goals", body: "Sneha Patel has submitted her FY goal sheet with 3 goals. Please review and approve or return for rework.",
      deepLink: "/approvals", read: false, channel: "teams",
    },
    {
      id: "ntf-seed-3", at: t(10), toUserId: "u-emp-3", kind: "goal_approved",
      title: "Your goals have been approved", body: "Your goal sheet has been approved and locked by Anita Rao. You can now log quarterly check-ins against your targets.",
      deepLink: "/checkins", read: false, channel: "email",
    },
    {
      id: "ntf-seed-4", at: t(10), toUserId: "u-emp-3", kind: "goal_approved",
      title: "Goals approved & locked", body: "Anita Rao approved your goal sheet. Head to Check-ins to log your Q1 actuals.",
      deepLink: "/checkins", read: false, channel: "teams",
    },
    {
      id: "ntf-seed-5", at: t(15), toUserId: "u-admin", kind: "info",
      title: "New cycle started", body: "The goal-setting window is now open. All employees can begin creating and submitting their goal sheets.",
      deepLink: "/admin/cycles", read: true, channel: "in_app",
    },
    {
      id: "ntf-seed-6", at: t(60), toUserId: "u-emp-2", kind: "checkin_reminder",
      title: "Q1 check-in reminder", body: "The Q1 check-in window will open soon. Make sure your goals are approved so you can log your quarterly actuals on time.",
      deepLink: "/checkins", read: false, channel: "email",
    },
    {
      id: "ntf-seed-7", at: t(120), toUserId: "u-mgr-eng", kind: "checkin_received",
      title: "Arjun Verma logged Q1 check-in", body: "Arjun Verma has updated his Q1 actuals. Review and add comments on the Team check-ins page.",
      deepLink: "/team", read: false, channel: "teams",
    },
  ];
}

export function buildSeed(): DB {
  const cycle = buildCycle();
  return {
    users,
    thrustAreas,
    cycles: [cycle],
    goals: buildSeedGoals(cycle.id),
    audit: [],
    notifications: buildSeedNotifications(),
    escalationRules,
    escalationLogs: [],
  };
}
