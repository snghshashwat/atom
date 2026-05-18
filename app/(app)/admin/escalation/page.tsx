import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/cycles";
import { getDB } from "@/lib/db";
import EscalationClient from "./EscalationClient";

export default async function EscalationPage() {
  await requireRole("admin");
  const db = getDB();
  return (
    <EscalationClient
      rules={db.escalationRules}
      logs={db.escalationLogs.map((l) => ({
        ...l,
        whenLabel: formatDateTime(l.at),
        targetName: db.users.find((u) => u.id === l.targetUserId)?.name ?? l.targetUserId,
        ruleName: db.escalationRules.find((r) => r.id === l.ruleId)?.name ?? l.ruleId,
      }))}
    />
  );
}
