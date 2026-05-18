import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { markRead } from "@/lib/notify";

export async function POST() {
  const user = await requireUser();
  markRead(user.id, "all");
  return NextResponse.json({ ok: true });
}
