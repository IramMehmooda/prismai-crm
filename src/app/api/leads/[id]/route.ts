import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const patchSchema = z.object({
  title: z.string().min(2).optional(),
  source: z.enum(["WEB", "REFERRAL", "TRADE_SHOW", "LINKEDIN", "COLD", "OTHER"]).optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"]).optional(),
  score: z.number().min(0).max(100).optional(),
  estimatedValue: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (Object.keys(parsed.data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const updated = await prisma.lead.update({
    where: { id: params.id },
    data: parsed.data,
  });

  if (parsed.data.status && parsed.data.status !== lead.status) {
    await prisma.activity.create({
      data: {
        type: "STATUS_CHANGE",
        subject: `Lead status updated → ${parsed.data.status}`,
        userId: session.sub,
        leadId: params.id,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.sub,
      action: "UPDATE",
      entity: "Lead",
      entityId: params.id,
      metadata: JSON.stringify({ status: parsed.data.status }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.$transaction([
    prisma.activity.updateMany({ where: { leadId: params.id }, data: { leadId: null } }),
    prisma.opportunity.updateMany({ where: { fromLeadId: params.id }, data: { fromLeadId: null } }),
    prisma.lead.delete({ where: { id: params.id } }),
    prisma.auditLog.create({ data: { userId: session.sub, action: "DELETE", entity: "Lead", entityId: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}