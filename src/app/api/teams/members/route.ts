import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({ teamId: z.string(), userId: z.string() });

async function requireAdmin() {
  const s = await getSession();
  if (!s) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (s.role !== "ADMIN") return { err: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session: s };
}

/** Add a single user to a team. */
export async function POST(req: NextRequest) {
  const { err, session } = await requireAdmin();
  if (err) return err;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { teamId, userId } = parsed.data;
  await prisma.team.update({
    where: { id: teamId },
    data: { members: { connect: { id: userId } } },
  });
  await prisma.auditLog.create({
    data: { userId: session!.sub, action: "UPDATE", entity: "Team", entityId: teamId, metadata: JSON.stringify({ addedUser: userId }) },
  });
  return NextResponse.json({ ok: true });
}

/** Remove a single user from a team (disconnect in M2M join table). */
export async function DELETE(req: NextRequest) {
  const { err, session } = await requireAdmin();
  if (err) return err;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { teamId, userId } = parsed.data;
  await prisma.team.update({
    where: { id: teamId },
    data: { members: { disconnect: { id: userId } } },
  });
  await prisma.auditLog.create({
    data: { userId: session!.sub, action: "UPDATE", entity: "Team", entityId: teamId, metadata: JSON.stringify({ removedUser: userId }) },
  });
  return NextResponse.json({ ok: true });
}
