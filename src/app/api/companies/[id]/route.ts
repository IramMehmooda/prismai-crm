import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2).optional(),
  nameAr: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  vatNumber: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const company = await prisma.company.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      nameAr: parsed.data.name === undefined && parsed.data.nameAr === undefined ? undefined : (parsed.data.nameAr ?? null),
      industry: parsed.data.industry ?? undefined,
      region: parsed.data.region ?? undefined,
      website: parsed.data.website ?? undefined,
      vatNumber: parsed.data.vatNumber ?? undefined,
      size: parsed.data.size ?? undefined,
    },
  });
  await prisma.auditLog.create({ data: { userId: session.sub, action: "UPDATE", entity: "Company", entityId: company.id, metadata: JSON.stringify(parsed.data) } });
  return NextResponse.json(company);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.$transaction([
    prisma.contact.updateMany({ where: { companyId: params.id }, data: { companyId: null } }),
    prisma.lead.updateMany({ where: { companyId: params.id }, data: { companyId: null } }),
    prisma.opportunity.updateMany({ where: { companyId: params.id }, data: { companyId: null } }),
    prisma.quote.updateMany({ where: { companyId: params.id }, data: { companyId: null } }),
    prisma.company.delete({ where: { id: params.id } }),
    prisma.auditLog.create({ data: { userId: session.sub, action: "DELETE", entity: "Company", entityId: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}