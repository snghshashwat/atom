import { getDB, newId, now, saveDB } from "./db";
import type { AuditAction, AuditLog } from "./types";

export function logAudit(entry: {
  actorId: string;
  action: AuditAction;
  targetType: AuditLog["targetType"];
  targetId: string;
  afterLock?: boolean;
  before?: unknown;
  after?: unknown;
  note?: string;
}): AuditLog {
  const db = getDB();
  const row: AuditLog = {
    id: newId("aud"),
    at: now(),
    ...entry,
  };
  db.audit.unshift(row);
  saveDB(db);
  return row;
}
