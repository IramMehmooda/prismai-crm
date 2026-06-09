import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({
  sku: z.string().min(2),
  name: z.string().min(2),
  nameAr: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  unitPriceSar: z.number().positive(),
  taxRate: z.number().min(0).max(1).optional(),
  category: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const product = await prisma.product.create({ data: parsed.data });
  await prisma.auditLog.create({ data: { userId: session.sub, action: "CREATE", entity: "Product", entityId: product.id } });
  return NextResponse.json(product, { status: 201 });
}
