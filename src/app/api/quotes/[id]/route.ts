import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calcTotals } from "@/lib/quotes";

const itemSchema = z.object({
  productId: z.string().nullable().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceSar: z.number().nonnegative(),
  discountPct: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).max(1).optional(),
});

const patchSchema = z.object({
  opportunityId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  buyerVat: z.string().nullable().optional(),
  buyerNameAr: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1).optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        items: { orderBy: { order: "asc" } },
        company: { include: { contacts: true } },
        opportunity: true,
      },
    });
    if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(quote);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { items, validUntil, ...fields } = parsed.data;

  const quoteData: any = { ...fields };
  if (validUntil !== undefined) {
    quoteData.validUntil = validUntil ? new Date(validUntil) : null;
  }

  if (items) {
    const totals = calcTotals(items);
    quoteData.subtotalSar = totals.subtotal;
    quoteData.discountSar = totals.discount;
    quoteData.vatSar = totals.vat;
    quoteData.totalSar = totals.total;
  }

  try {
    const quote = await prisma.$transaction(async (tx) => {
      if (items) {
        await tx.quoteItem.deleteMany({ where: { quoteId: params.id } });
        await tx.quoteItem.createMany({
          data: items.map((it, idx) => ({
            quoteId: params.id,
            productId: it.productId ?? null,
            description: it.description,
            quantity: it.quantity,
            unitPriceSar: it.unitPriceSar,
            discountPct: it.discountPct ?? 0,
            taxRate: it.taxRate ?? 0.15,
            lineTotal: it.quantity * it.unitPriceSar * (1 - (it.discountPct ?? 0) / 100),
            order: idx,
          })),
        });
      }
      return tx.quote.update({
        where: { id: params.id },
        data: quoteData,
        include: { items: true },
      });
    });
    await prisma.auditLog.create({ data: { userId: session.sub, action: "UPDATE", entity: "Quote", entityId: quote.id, metadata: JSON.stringify({ totalSar: quote.totalSar }) } });
    return NextResponse.json(quote);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.quote.delete({ where: { id: params.id } });
    await prisma.auditLog.create({ data: { userId: session.sub, action: "DELETE", entity: "Quote", entityId: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
