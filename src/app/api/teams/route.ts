import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const createSchema = z.object({ name: z.string().min(2).max(60) });
const patchSchema = z.object({ id: z.string(), name: z.string().min(2).max(60) });
const deleteSchema = z.object({ id: z.string() });

async function requireAdmin() {
  const s = await getSession();
  if (!s) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (s.role !== "ADMIN") return { err: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session: s };
}

export async function GET() {
  const { err } = await requireAdmin();
  if (err) return err;
  const teams = await prisma.team.findMany({
    include: {
      _count: { select: { members: true } },
      members: {
        select: { id: true, name: true, email: true, role: true, isActive: true, image: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
  const { err, session } = await requireAdmin();
  if (err) return err;
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const team = await prisma.team.create({ data: parsed.data });
  await prisma.auditLog.create({ data: { userId: session!.sub, action: "CREATE", entity: "Team", entityId: team.id, metadata: JSON.stringify(parsed.data) } });
  return NextResponse.json(team, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { err, session } = await requireAdmin();
  if (err) return err;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const team = await prisma.team.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name } });
  await prisma.auditLog.create({ data: { userId: session!.sub, action: "UPDATE", entity: "Team", entityId: team.id, metadata: JSON.stringify({ name: parsed.data.name }) } });
  return NextResponse.json(team);
}

export async function DELETE(req: NextRequest) {
  const { err, session } = await requireAdmin();
  if (err) return err;
  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  // disconnect all members first, then delete
  await prisma.team.update({ where: { id: parsed.data.id }, data: { members: { set: [] } } });
  await prisma.team.delete({ where: { id: parsed.data.id } });
  await prisma.auditLog.create({ data: { userId: session!.sub, action: "DELETE", entity: "Team", entityId: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
