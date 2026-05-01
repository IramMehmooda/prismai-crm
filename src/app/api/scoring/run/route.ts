import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recomputeAllLeadScores } from "@/lib/scoring";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const n = await recomputeAllLeadScores();
  await prisma.auditLog.create({ data: { userId: session.sub, action: "RUN_SCORING", entity: "Lead", entityId: "*", metadata: JSON.stringify({ count: n }) } });
  return NextResponse.json({ ok: true, updated: n });
}
