import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assigneeId: z.string(),
  leadId: z.string().nullable().optional(),
  opportunityId: z.string().nullable().optional(),
});

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["OPEN", "DONE", "CANCELLED"]).optional(),
  title: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

const deleteSchema = z.object({
  id: z.string(),
});

export async function GET() {
  const tasks = await prisma.task.findMany({
    include: { assignee: true, lead: true, opportunity: true },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const task = await prisma.task.create({
    data: {
      ...parsed.data,
      dueAt: normalizeDueAt(parsed.data.dueAt),
      creatorId: session.sub,
    },
  });
  await prisma.auditLog.create({ data: { userId: session.sub, action: "CREATE", entity: "Task", entityId: task.id } });
  if (task.assigneeId && task.assigneeId !== session.sub) {
    await notify({
      userId: task.assigneeId,
      type: "TASK_ASSIGNED",
      title: `New task: ${task.title}`,
      body: task.dueAt ? `Due ${formatDueAtLabel(task.dueAt, session.locale)} — assigned by ${session.name}.` : `Assigned by ${session.name}.`,
      href: `/tasks`,
      entity: "Task",
      entityId: task.id,
    });
  }
  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, ...rest } = parsed.data;
  const data: any = { ...rest };
  if (Object.prototype.hasOwnProperty.call(data, "dueAt")) data.dueAt = normalizeDueAt(data.dueAt);
  if (data.status === "DONE") data.completedAt = new Date();
  if (data.status && data.status !== "DONE") data.completedAt = null;
  const t = await prisma.task.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { userId: session.sub, action: "UPDATE", entity: "Task", entityId: id, metadata: JSON.stringify(data) } });
  return NextResponse.json(t);
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await prisma.task.delete({ where: { id: parsed.data.id } });
  await prisma.auditLog.create({ data: { userId: session.sub, action: "DELETE", entity: "Task", entityId: parsed.data.id } });
  return NextResponse.json({ ok: true });
}

function normalizeDueAt(value?: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) return value;
  const date = new Date(value);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

function formatDueAtLabel(value: string, locale?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
  }).format(new Date(Number(year), Number(month) - 1, Number(day)));
}
