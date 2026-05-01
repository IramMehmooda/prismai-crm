import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ results: [] }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  // Split into tokens so "Yusuf Bakr" matches first+last across fields.
  const tokens = q.split(/\s+/).filter((t) => t.length >= 1);

  // Helper: build an AND of per-token ORs (each token must match at least one field).
  const tokenAnd = (fields: string[]) => ({
    AND: tokens.map((tok) => ({
      OR: fields.map((f) => ({ [f]: { contains: tok } })),
    })),
  });

  // SQLite is case-insensitive for ASCII with LIKE; Prisma's "contains" maps to LIKE.
  const take = 5;
  const [leads, contacts, companies, opps, quotes, products] = await Promise.all([
    prisma.lead.findMany({
      where: tokenAnd(["title", "notes"]) as any,
      select: { id: true, title: true, status: true, company: { select: { name: true } } },
      take,
    }),
    prisma.contact.findMany({
      where: tokenAnd(["firstName", "lastName", "email", "nameAr"]) as any,
      select: { id: true, firstName: true, lastName: true, email: true, company: { select: { name: true } } },
      take,
    }),
    prisma.company.findMany({
      where: tokenAnd(["name", "nameAr", "website"]) as any,
      select: { id: true, name: true, industry: true, region: true },
      take,
    }),
    prisma.opportunity.findMany({
      where: tokenAnd(["title"]) as any,
      select: { id: true, title: true, amount: true, stage: { select: { name: true } }, company: { select: { name: true } } },
      take,
    }),
    prisma.quote.findMany({
      where: tokenAnd(["number", "notes", "buyerNameAr"]) as any,
      select: { id: true, number: true, status: true, totalSar: true, company: { select: { name: true } } },
      take,
    }),
    prisma.product.findMany({
      where: tokenAnd(["name", "sku", "nameAr", "description"]) as any,
      select: { id: true, sku: true, name: true, unitPriceSar: true },
      take,
    }),
  ]);

  type Result = { id: string; type: string; title: string; subtitle?: string; href: string };
  const results: Result[] = [
    ...leads.map((l) => ({ id: l.id, type: "Lead", title: l.title, subtitle: `${l.status}${l.company ? " · " + l.company.name : ""}`, href: `/leads` })),
    ...contacts.map((c) => ({ id: c.id, type: "Contact", title: `${c.firstName} ${c.lastName}`.trim(), subtitle: [c.email, c.company?.name].filter(Boolean).join(" · "), href: `/contacts` })),
    ...companies.map((c) => ({ id: c.id, type: "Company", title: c.name, subtitle: [c.industry, c.region].filter(Boolean).join(" · "), href: `/companies` })),
    ...opps.map((o) => ({ id: o.id, type: "Opportunity", title: o.title, subtitle: `${o.stage?.name ?? "—"} · SAR ${Math.round(o.amount).toLocaleString()}${o.company ? " · " + o.company.name : ""}`, href: `/pipeline` })),
    ...quotes.map((q2) => ({ id: q2.id, type: "Quote", title: q2.number, subtitle: `${q2.status} · SAR ${Math.round(q2.totalSar).toLocaleString()}${q2.company ? " · " + q2.company.name : ""}`, href: `/quotes/${q2.id}` })),
    ...products.map((p) => ({ id: p.id, type: "Product", title: `${p.sku} — ${p.name}`, subtitle: `SAR ${Math.round(p.unitPriceSar).toLocaleString()}`, href: `/products` })),
  ];

  return NextResponse.json({ results });
}
