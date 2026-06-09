import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requiredApprovalLevel } from "@/lib/quotes";
import { notify, notifyMany, userIdsByRoles } from "@/lib/notify";

export const dynamic = "force-dynamic";
const schema = z.object({
  action: z.enum(["SUBMIT", "APPROVE", "REJECT", "SEND", "ACCEPT", "DECLINE"]),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const quote = await prisma.quote.findUnique({ where: { id: params.id }, include: { items: true, approvals: { orderBy: { createdAt: "desc" } } } });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.action === "SUBMIT") {
    const maxDisc = Math.max(0, ...quote.items.map((i) => i.discountPct));
    const level = requiredApprovalLevel(quote.totalSar, maxDisc);
    if (!level) {
      await prisma.quote.update({ where: { id: quote.id }, data: { status: "APPROVED" } });
      if (quote.ownerId) await notify({ userId: quote.ownerId, type: "QUOTE_APPROVED", title: `Quote ${quote.number} auto-approved`, body: `Total SAR ${Math.round(quote.totalSar).toLocaleString()} — below approval threshold.`, href: `/quotes/${quote.id}`, entity: "Quote", entityId: quote.id });
      return NextResponse.json({ ok: true, status: "APPROVED", level: null });
    }
    await prisma.quote.update({ where: { id: quote.id }, data: { status: "PENDING_APPROVAL" } });
    await prisma.quoteApproval.create({ data: { quoteId: quote.id, level, requestedById: session.sub } });
    await prisma.auditLog.create({ data: { userId: session.sub, action: "SUBMIT", entity: "Quote", entityId: quote.id, metadata: JSON.stringify({ level }) } });
    // Notify approvers
    const approverRoles = level === "FINANCE" ? ["FINANCE", "ADMIN"] : ["SALES_MANAGER", "FINANCE", "ADMIN"];
    const approverIds = (await userIdsByRoles(approverRoles)).filter((id) => id !== session.sub);
    await notifyMany(approverIds, {
      type: "QUOTE_APPROVAL_REQUESTED",
      title: `Approval requested: ${quote.number}`,
      body: `${session.name} submitted a quote of SAR ${Math.round(quote.totalSar).toLocaleString()} (${level} level).`,
      href: `/quotes/${quote.id}`,
      entity: "Quote",
      entityId: quote.id,
    });
    return NextResponse.json({ ok: true, status: "PENDING_APPROVAL", level });
  }

  if (parsed.data.action === "APPROVE" || parsed.data.action === "REJECT") {
    const pending = quote.approvals.find((a) => a.status === "PENDING");
    if (!pending) return NextResponse.json({ error: "No pending approval" }, { status: 400 });
    const role = session.role;
    const allowed = (pending.level === "MANAGER" && (role === "SALES_MANAGER" || role === "ADMIN"))
                 || (pending.level === "FINANCE" && (role === "FINANCE" || role === "ADMIN"));
    if (!allowed) return NextResponse.json({ error: `Requires ${pending.level} role` }, { status: 403 });
    const status = parsed.data.action === "APPROVE" ? "APPROVED" : "REJECTED";
    await prisma.quoteApproval.update({ where: { id: pending.id }, data: { status, decidedById: session.sub, decidedAt: new Date(), reason: parsed.data.reason } });
    await prisma.quote.update({ where: { id: quote.id }, data: { status } });
    await prisma.auditLog.create({ data: { userId: session.sub, action: parsed.data.action, entity: "Quote", entityId: quote.id, metadata: JSON.stringify({ reason: parsed.data.reason }) } });
    if (quote.ownerId) await notify({
      userId: quote.ownerId,
      type: status === "APPROVED" ? "QUOTE_APPROVED" : "QUOTE_REJECTED",
      title: `Quote ${quote.number} ${status.toLowerCase()}`,
      body: status === "APPROVED" ? `Approved by ${session.name}.` : `Rejected by ${session.name}${parsed.data.reason ? " — " + parsed.data.reason : ""}.`,
      href: `/quotes/${quote.id}`,
      entity: "Quote",
      entityId: quote.id,
    });
    return NextResponse.json({ ok: true, status });
  }

  if (parsed.data.action === "SEND") {
    if (quote.status !== "APPROVED") return NextResponse.json({ error: "Only APPROVED quotes can be sent" }, { status: 400 });
    await prisma.quote.update({ where: { id: quote.id }, data: { status: "SENT" } });
    await prisma.auditLog.create({ data: { userId: session.sub, action: "SEND", entity: "Quote", entityId: quote.id } });
    return NextResponse.json({ ok: true, status: "SENT" });
  }

  if (parsed.data.action === "ACCEPT" || parsed.data.action === "DECLINE") {
    const status = parsed.data.action === "ACCEPT" ? "ACCEPTED" : "DECLINED";
    await prisma.quote.update({ where: { id: quote.id }, data: { status } });
    await prisma.auditLog.create({ data: { userId: session.sub, action: parsed.data.action, entity: "Quote", entityId: quote.id } });
    if (quote.ownerId) await notify({
      userId: quote.ownerId,
      type: status === "ACCEPTED" ? "QUOTE_ACCEPTED" : "QUOTE_REJECTED",
      title: `Quote ${quote.number} ${status.toLowerCase()} by customer`,
      href: `/quotes/${quote.id}`,
      entity: "Quote",
      entityId: quote.id,
    });
    return NextResponse.json({ ok: true, status });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
