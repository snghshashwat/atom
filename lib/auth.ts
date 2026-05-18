import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDB } from "./db";
import type { Role, User } from "./types";

const SESSION_COOKIE = "atom_session";

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const userId = store.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  return getDB().users.find((u) => u.id === userId) ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireRole(...roles: Role[]): Promise<User> {
  const u = await requireUser();
  if (!roles.includes(u.role)) redirect("/forbidden");
  return u;
}

export async function setSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function findUserByCredentials(email: string, password: string): User | null {
  const u = getDB().users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  return u ?? null;
}
