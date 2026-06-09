import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
});

export async function GET() {
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: { contacts: true },
  });
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const c = await prisma.company.create({
    data: {
      name: parsed.data.name,
      nameAr: parsed.data.nameAr || null,
      industry: parsed.data.industry || null,
      region: parsed.data.region || null,
      website: parsed.data.website || null,
      vatNumber: parsed.data.vatNumber || null,
      size: parsed.data.size || null,
      ownerId: session.sub,
    },
  });
  await prisma.auditLog.create({
    data: { userId: session.sub, action: "CREATE", entity: "Company", entityId: c.id },
  });
  return NextResponse.json(c, { status: 201 });
}
