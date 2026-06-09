import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  nameAr: z.string().nullable().optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      nameAr: data.nameAr ?? undefined,
      email: data.email === "" ? null : data.email ?? undefined,
      phone: data.phone ?? undefined,
      whatsapp: data.whatsapp ?? undefined,
      title: data.title ?? undefined,
      companyId: data.companyId ?? undefined,
    },
  });
  await prisma.auditLog.create({ data: { userId: session.sub, action: "UPDATE", entity: "Contact", entityId: contact.id, metadata: JSON.stringify(data) } });
  return NextResponse.json(contact);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.$transaction([
    prisma.campaignMember.deleteMany({ where: { contactId: params.id } }),
    prisma.lead.updateMany({ where: { contactId: params.id }, data: { contactId: null } }),
    prisma.opportunity.updateMany({ where: { contactId: params.id }, data: { contactId: null } }),
    prisma.quote.updateMany({ where: { contactId: params.id }, data: { contactId: null } }),
    prisma.activity.updateMany({ where: { contactId: params.id }, data: { contactId: null } }),
    prisma.contact.delete({ where: { id: params.id } }),
    prisma.auditLog.create({ data: { userId: session.sub, action: "DELETE", entity: "Contact", entityId: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}