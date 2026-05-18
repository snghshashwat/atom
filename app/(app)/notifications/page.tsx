import { requireUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { formatDateTime } from "@/lib/cycles";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  const user = await requireUser();
  const db = getDB();
  const items = db.notifications
    .filter((n) => n.toUserId === user.id)
    .map((n) => ({ ...n, when: formatDateTime(n.at) }));
  return <NotificationsClient items={items} />;
}
