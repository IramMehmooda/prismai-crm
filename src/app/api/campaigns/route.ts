import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2),
  channel: z.enum(["EMAIL", "WHATSAPP", "EVENT", "LINKEDIN", "OTHER"]),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "DONE"]).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  budgetSar: z.number().nullable().optional(),
  goal: z.string().nullable().optional(),
});

export async function GET() {
  const camps = await prisma.campaign.findMany({
    include: { _count: { select: { members: true, leads: true } }, owner: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(camps);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const c = await prisma.campaign.create({
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      ownerId: session.sub,
    },
  });
  await prisma.auditLog.create({ data: { userId: session.sub, action: "CREATE", entity: "Campaign", entityId: c.id } });
  return NextResponse.json(c, { status: 201 });
}
