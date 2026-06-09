import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const ROLES = ["ADMIN", "SALES_MANAGER", "SALES_REP", "FINANCE", "MARKETING"] as const;

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(ROLES),
  password: z.string().min(8).max(72),
  locale: z.enum(["en", "ar"]).optional().default("en"),
  // array of team IDs to connect on creation
  teamIds: z.array(z.string()).optional().default([]),
});

const patchSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(100).optional(),
  role: z.enum(ROLES).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  // full replacement of team memberships (array of team IDs)
  teamIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(72).optional(),
});

async function requireAdmin() {
  const s = await getSession();
  if (!s) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (s.role !== "ADMIN") return { err: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session: s };
}

export async function GET() {
  const { err } = await requireAdmin();
  if (err) return err;
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, locale: true, isActive: true,
      image: true, createdAt: true, googleId: true,
      teams: { select: { id: true, name: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { err, session } = await requireAdmin();
  if (err) return err;
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const u = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      locale: parsed.data.locale ?? "en",
      teams: parsed.data.teamIds.length > 0 ? { connect: parsed.data.teamIds.map((id) => ({ id })) } : undefined,
      passwordHash,
    },
    select: { id: true, email: true, name: true, role: true, teams: { select: { id: true, name: true } } },
  });
  await prisma.auditLog.create({ data: { userId: session!.sub, action: "CREATE", entity: "User", entityId: u.id, metadata: JSON.stringify({ email: u.email }) } });
  return NextResponse.json(u, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { err, session } = await requireAdmin();
  if (err) return err;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, password, teamIds, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  if (teamIds !== undefined) {
    data.teams = { set: teamIds.map((tid) => ({ id: tid })) };
  }
  const u = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, isActive: true, teams: { select: { id: true, name: true } } },
  });
  await prisma.auditLog.create({ data: { userId: session!.sub, action: "UPDATE", entity: "User", entityId: u.id } });
  return NextResponse.json(u);
}
