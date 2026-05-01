import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  title: z.string().min(2),
  source: z.enum(["WEB","REFERRAL","TRADE_SHOW","LINKEDIN","COLD","OTHER"]),
  status: z.enum(["NEW","CONTACTED","QUALIFIED","DISQUALIFIED","CONVERTED"]).optional(),
  score: z.number().min(0).max(100).optional(),
  estimatedValue: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
});

export async function GET() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const lead = await prisma.lead.create({
    data: {
      ...parsed.data,
      ownerId: session.sub,
    },
  });
  await prisma.auditLog.create({
    data: { userId: session.sub, action: "CREATE", entity: "Lead", entityId: lead.id },
  });
  return NextResponse.json(lead, { status: 201 });
}
