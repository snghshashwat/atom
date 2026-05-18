import { getDB, newId, now, saveDB } from "./db";
import { activeQuarter, getActiveCycle } from "./cycles";
import { notify } from "./notify";
import type { EscalationLog, EscalationRule, User } from "./types";

const DAY_MS = 86_400_000;

// Find HR / admin recipients for HR-tier notifications.
function admins(): User[] { return getDB().users.filter((u) => u.role === "admin"); }

function logEsc(ruleId: string, targetUserId: string, message: string): EscalationLog {
  const db = getDB();
  const row: EscalationLog = { id: newId("esc"), at: now(), ruleId, targetUserId, message };
  db.escalationLogs.unshift(row);
  saveDB(db);
  return row;
}

function alreadyEscalated(ruleId: string, targetUserId: string, withinDays = 7): boolean {
  const cutoff = Date.now() - withinDays * DAY_MS;
  return getDB().escalationLogs.some(
    (e) => e.ruleId === ruleId && e.targetUserId === targetUserId && new Date(e.at).getTime() > cutoff,
  );
}

function deepLinkForGoals(): string { return "/goals"; }
function deepLinkForApprovals(): string { return "/approvals"; }
function deepLinkForCheckins(): string { return "/checkins"; }

function fire(rule: EscalationRule, target: User, message: string, deepLink: string) {
  if (alreadyEscalated(rule.id, target.id)) return;
  logEsc(rule.id, target.id, message);
  if (rule.notifyEmployee) {
    notify({ toUserId: target.id, channel: "email", kind: "escalation", title: rule.name, body: message, deepLink });
  }
  if (rule.notifyManager && target.managerId) {
    notify({ toUserId: target.managerId, channel: "email", kind: "escalation", title: `Escalation: ${target.name}`, body: message, deepLink });
  }
  if (rule.notifyHR) {
    for (const a of admins()) {
      notify({ toUserId: a.id, channel: "teams", kind: "escalation", title: `Escalation: ${target.name}`, body: message, deepLink });
    }
  }
}

export interface EscalationRunSummary {
  ranAt: string;
  triggered: number;
  ruleHits: Array<{ ruleId: string; ruleName: string; count: number }>;
}

// Run all enabled rules against the active cycle and produce escalations.
export function runEscalations(): EscalationRunSummary {
  const db = getDB();
  const cycle = getActiveCycle();
  const cycleStart = new Date(cycle.goalSettingOpens).getTime();
  const t = new Date(now()).getTime();
  const summary: EscalationRunSummary = { ranAt: now(), triggered: 0, ruleHits: [] };
  const counts = new Map<string, number>();
  const bump = (rule: EscalationRule) => {
    summary.triggered++;
    counts.set(rule.id, (counts.get(rule.id) ?? 0) + 1);
  };

  const employees = db.users.filter((u) => u.role === "employee");
  for (const rule of db.escalationRules.filter((r) => r.enabled)) {
    if (rule.trigger === "no_submission") {
      const daysSinceOpen = Math.floor((t - cycleStart) / DAY_MS);
      if (daysSinceOpen < rule.thresholdDays) continue;
      for (const emp of employees) {
        const hasAny = db.goals.some(
          (g) => g.cycleId === cycle.id && g.ownerId === emp.id && g.state !== "draft",
        );
        if (!hasAny) {
          fire(rule, emp, `${emp.name} has not submitted any goals (${daysSinceOpen} days since cycle opened).`, deepLinkForGoals());
          bump(rule);
        }
      }
    } else if (rule.trigger === "no_approval") {
      for (const emp of employees) {
        const submittedGoals = db.goals.filter(
          (g) => g.cycleId === cycle.id && g.ownerId === emp.id && g.state === "submitted" && g.submittedAt,
        );
        const oldest = submittedGoals
          .map((g) => new Date(g.submittedAt!).getTime())
          .sort((a, b) => a - b)[0];
        if (!oldest) continue;
        const days = Math.floor((t - oldest) / DAY_MS);
        if (days < rule.thresholdDays) continue;
        fire(rule, emp, `${emp.name}'s submitted goals have been awaiting approval for ${days} days.`, deepLinkForApprovals());
        bump(rule);
      }
    } else if (rule.trigger === "no_checkin") {
      const q = activeQuarter(cycle);
      if (!q) continue;
      for (const emp of employees) {
        const empGoals = db.goals.filter(
          (g) => g.cycleId === cycle.id && g.ownerId === emp.id && (g.state === "approved" || g.state === "unlocked"),
        );
        if (empGoals.length === 0) continue;
        const anyCheckin = empGoals.some((g) => g.checkins[q]?.actual || g.checkins[q]?.status);
        if (anyCheckin) continue;
        // Time since the active quarter opened
        const qStart = new Date(
          q === "Q1" ? cycle.q1Opens : q === "Q2" ? cycle.q2Opens : q === "Q3" ? cycle.q3Opens : cycle.q4Opens,
        ).getTime();
        const days = Math.floor((t - qStart) / DAY_MS);
        if (days < rule.thresholdDays) continue;
        fire(rule, emp, `${emp.name} has not logged any ${q} check-in (${days} days into the quarter).`, deepLinkForCheckins());
        bump(rule);
      }
    }
  }
  summary.ruleHits = Array.from(counts.entries()).map(([ruleId, count]) => {
    const r = db.escalationRules.find((x) => x.id === ruleId);
    return { ruleId, ruleName: r?.name ?? ruleId, count };
  });
  return summary;
}
