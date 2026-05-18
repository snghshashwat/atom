import { getDB, newId, now, saveDB } from "./db";
import type { Notification } from "./types";

export function notify(n: Omit<Notification, "id" | "at" | "read">): Notification {
  const db = getDB();
  const row: Notification = {
    ...n,
    id: newId("ntf"),
    at: now(),
    read: false,
  };
  db.notifications.unshift(row);
  saveDB(db);
  return row;
}

export function markRead(userId: string, ids: string[] | "all"): void {
  const db = getDB();
  for (const n of db.notifications) {
    if (n.toUserId !== userId) continue;
    if (ids === "all" || ids.includes(n.id)) n.read = true;
  }
  saveDB(db);
}

export function unreadCount(userId: string): number {
  return getDB().notifications.filter((n) => n.toUserId === userId && !n.read).length;
}
