import { requireRole } from "@/lib/auth";
import { getDB } from "@/lib/db";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  await requireRole("admin");
  const db = getDB();
  return <UsersClient users={db.users} />;
}
