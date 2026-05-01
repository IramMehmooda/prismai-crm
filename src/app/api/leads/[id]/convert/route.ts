import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";

const schema = z.object({
  stageId: z.string().optional(),
  amount: z.number().optional(),
  expectedCloseAt: z.string().nullable().optional(),
  ownerId: z.string().optional(),
  startDate: z.string().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.opportunityId) return NextResponse.json({ error: "Already converted" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let stageId = parsed.data.stageId;
  if (!stageId) {
    const stage = await prisma.pipelineStage.findFirst({ where: { name: "Qualified" } }) ?? await prisma.pipelineStage.findFirst({ orderBy: { order: "asc" } });
    if (!stage) return NextResponse.json({ error: "No pipeline stages defined" }, { status: 500 });
    stageId = stage.id;
  }
  const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 400 });

  const opp = await prisma.opportunity.create({
    data: {
      title: lead.title,
      amount: parsed.data.amount ?? lead.estimatedValue ?? 0,
      stageId,
      probability: stage.probability,
      expectedCloseAt: parsed.data.expectedCloseAt ? new Date(parsed.data.expectedCloseAt) : null,
      ownerId: parsed.data.ownerId || lead.ownerId || session.sub,
      companyId: lead.companyId,
      contactId: lead.contactId,
      fromLeadId: lead.id,
      createdAt: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    },
  });
  await prisma.lead.update({ where: { id: lead.id }, data: { status: "CONVERTED", convertedAt: new Date(), opportunityId: opp.id } });
  await prisma.activity.create({ data: { type: "STATUS_CHANGE", subject: `Lead converted → Opportunity ${opp.title}`, userId: session.sub, leadId: lead.id, opportunityId: opp.id } });
  await prisma.auditLog.create({ data: { userId: session.sub, action: "CONVERT", entity: "Lead", entityId: lead.id, metadata: JSON.stringify({ opportunityId: opp.id }) } });
  if (opp.ownerId && opp.ownerId !== session.sub) {
    await notify({
      userId: opp.ownerId,
      type: "LEAD_CONVERTED",
      title: `New opportunity: ${opp.title}`,
      body: `${session.name} converted a lead to a deal worth SAR ${Math.round(opp.amount).toLocaleString()}.`,
      href: `/pipeline`,
      entity: "Opportunity",
      entityId: opp.id,
    });
  }
  return NextResponse.json({ ok: true, opportunityId: opp.id }, { status: 201 });
}
