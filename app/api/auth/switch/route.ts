import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { getDB } from "@/lib/db";

export async function POST(req: Request) {
  const { userId } = await req.json();
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  }
  const u = getDB().users.find((u) => u.id === userId);
  if (!u) return NextResponse.json({ ok: false, error: "Unknown user" }, { status: 404 });
  await setSession(u.id);
  return NextResponse.json({ ok: true, user: { id: u.id, role: u.role, name: u.name } });
}
