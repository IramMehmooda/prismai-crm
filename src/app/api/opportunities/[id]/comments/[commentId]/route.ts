import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const patchSchema = z.object({
  body: z.string().trim().min(1),
});

function canManageComment(session: { sub: string; role: string }, userId: string) {
  return session.sub === userId || session.role === "ADMIN" || session.role === "SALES_MANAGER";
}

function summarizeComment(body: string) {
  const trimmed = body.trim().replace(/\s+/g, " ");
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.opportunityComment.findUnique({ where: { id: params.commentId } });
  if (!existing || existing.opportunityId !== params.id) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  if (!canManageComment(session, existing.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.$transaction(async (tx) => {
    const comment = await tx.opportunityComment.update({
      where: { id: params.commentId },
      data: { body: parsed.data.body },
      include: { user: { select: { id: true, name: true } } },
    });

    await tx.activity.create({
      data: {
        type: "NOTE",
        subject: "Comment edited",
        body: summarizeComment(parsed.data.body),
        userId: session.sub,
        opportunityId: params.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.sub,
        action: "UPDATE_COMMENT",
        entity: "OpportunityComment",
        entityId: params.commentId,
        metadata: JSON.stringify({ opportunityId: params.id }),
      },
    });

    return comment;
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.opportunityComment.findUnique({ where: { id: params.commentId } });
  if (!existing || existing.opportunityId !== params.id) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  if (!canManageComment(session, existing.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.$transaction(async (tx) => {
    await tx.activity.create({
      data: {
        type: "NOTE",
        subject: "Comment deleted",
        body: summarizeComment(existing.body),
        userId: session.sub,
        opportunityId: params.id,
      },
    });

    await tx.opportunityComment.delete({ where: { id: params.commentId } });

    await tx.auditLog.create({
      data: {
        userId: session.sub,
        action: "DELETE_COMMENT",
        entity: "OpportunityComment",
        entityId: params.commentId,
        metadata: JSON.stringify({ opportunityId: params.id }),
      },
    });
  });

  return NextResponse.json({ ok: true });
}
