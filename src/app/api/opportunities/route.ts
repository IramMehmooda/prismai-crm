import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const createSchema = z.object({
  title: z.string().min(2),
  amount: z.number().positive(),
  stageId: z.string(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseAt: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  fromLeadId: z.string().nullable().optional(),
});

const patchSchema = z.object({
  id: z.string(),
  stageId: z.string().optional(),
  amount: z.number().optional(),
  probability: z.number().min(0).max(100).optional(),
  closeReason: z.string().optional(),
});

export async function GET() {
  const opps = await prisma.opportunity.findMany({
    include: { stage: true, company: true, contact: true, owner: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(opps);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const stage = await prisma.pipelineStage.findUnique({ where: { id: parsed.data.stageId } });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 400 });
  const opp = await prisma.opportunity.create({
    data: {
      ...parsed.data,
      expectedCloseAt: parsed.data.expectedCloseAt ? new Date(parsed.data.expectedCloseAt) : null,
      probability: parsed.data.probability ?? stage.probability,
      ownerId: session.sub,
    },
  });
  await prisma.auditLog.create({ data: { userId: session.sub, action: "CREATE", entity: "Opportunity", entityId: opp.id } });
  return NextResponse.json(opp, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, stageId, ...rest } = parsed.data;
  const before = await prisma.opportunity.findUnique({ where: { id }, include: { stage: true } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = { ...rest };
  if (stageId && stageId !== before.stageId) {
    const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 400 });
    data.stageId = stageId;
    data.probability = rest.probability ?? stage.probability;
    if (stage.isWon || stage.isLost) data.closedAt = new Date();
    await prisma.activity.create({
      data: {
        type: "STAGE_CHANGE",
        subject: `Stage: ${before.stage.name} → ${stage.name}`,
        userId: session.sub,
        opportunityId: id,
      },
    });
  }
  const updated = await prisma.opportunity.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { userId: session.sub, action: "UPDATE", entity: "Opportunity", entityId: id, metadata: JSON.stringify(data) } });
  return NextResponse.json(updated);
}
