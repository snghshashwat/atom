import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { runEscalations } from "@/lib/escalation";

export async function POST() {
  await requireRole("admin", "manager");
  const summary = runEscalations();
  return NextResponse.json(summary);
}
