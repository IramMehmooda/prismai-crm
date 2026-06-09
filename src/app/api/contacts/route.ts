import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nameAr: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  companyId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const contact = await prisma.contact.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      nameAr: data.nameAr || null,
      email: data.email || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      title: data.title || null,
      companyId: data.companyId || null,
      ownerId: session.sub,
    },
  });
  await prisma.auditLog.create({
    data: { userId: session.sub, action: "CREATE", entity: "Contact", entityId: contact.id },
  });
  return NextResponse.json(contact, { status: 201 });
}
