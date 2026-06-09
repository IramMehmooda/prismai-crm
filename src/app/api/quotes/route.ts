import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcTotals, nextQuoteNumber } from "@/lib/quotes";

export const dynamic = "force-dynamic";
const itemSchema = z.object({
  productId: z.string().nullable().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceSar: z.number().nonnegative(),
  discountPct: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).max(1).optional(),
});

const createSchema = z.object({
  opportunityId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  buyerVat: z.string().nullable().optional(),
  buyerNameAr: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1),
});

export async function GET() {
  const quotes = await prisma.quote.findMany({
    include: { company: true, contact: true, opportunity: true, owner: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const totals = calcTotals(parsed.data.items);
  const number = await nextQuoteNumber();
  const quote = await prisma.quote.create({
    data: {
      number,
      status: "DRAFT",
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      notes: parsed.data.notes,
      buyerVat: parsed.data.buyerVat,
      buyerNameAr: parsed.data.buyerNameAr,
      opportunityId: parsed.data.opportunityId,
      companyId: parsed.data.companyId,
      contactId: parsed.data.contactId,
      ownerId: session.sub,
      subtotalSar: totals.subtotal,
      discountSar: totals.discount,
      vatSar: totals.vat,
      totalSar: totals.total,
      items: {
        create: parsed.data.items.map((it, idx) => ({
          productId: it.productId ?? null,
          description: it.description,
          quantity: it.quantity,
          unitPriceSar: it.unitPriceSar,
          discountPct: it.discountPct ?? 0,
          taxRate: it.taxRate ?? 0.15,
          lineTotal: it.quantity * it.unitPriceSar * (1 - (it.discountPct ?? 0) / 100),
          order: idx,
        })),
      },
    },
  });
  await prisma.auditLog.create({ data: { userId: session.sub, action: "CREATE", entity: "Quote", entityId: quote.id, metadata: JSON.stringify({ totalSar: totals.total }) } });
  return NextResponse.json(quote, { status: 201 });
}
