import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const createSchema = z.object({
  body: z.string().trim().min(1),
});

function summarizeComment(body: string) {
  const trimmed = body.trim().replace(/\s+/g, " ");
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const opportunity = await prisma.opportunity.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.opportunityComment.create({
      data: {
        body: parsed.data.body,
        userId: session.sub,
        opportunityId: params.id,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    await tx.activity.create({
      data: {
        type: "NOTE",
        subject: "Comment added",
        body: summarizeComment(parsed.data.body),
        userId: session.sub,
        opportunityId: params.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.sub,
        action: "CREATE_COMMENT",
        entity: "OpportunityComment",
        entityId: created.id,
        metadata: JSON.stringify({ opportunityId: params.id }),
      },
    });

    return created;
  });

  return NextResponse.json(comment, { status: 201 });
}
