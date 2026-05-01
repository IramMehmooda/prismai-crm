import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { type Locale } from "@/lib/i18n";
import QuoteBuilder from "./QuoteBuilder";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({ searchParams }: { searchParams?: { opportunityId?: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const [products, companies, opps] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.company.findMany({ orderBy: { name: "asc" }, include: { contacts: true } }),
    prisma.opportunity.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { company: true } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">{locale === "ar" ? "عرض جديد" : "New quote"}</h1>
      <QuoteBuilder
        locale={locale}
        products={products.map((p) => ({ id: p.id, sku: p.sku, name: p.name, nameAr: p.nameAr, unitPriceSar: p.unitPriceSar, taxRate: p.taxRate }))}
        companies={companies.map((c) => ({ id: c.id, name: c.name, vatNumber: c.vatNumber, nameAr: c.nameAr, contacts: c.contacts.map((x) => ({ id: x.id, name: `${x.firstName} ${x.lastName}` })) }))}
        opportunities={opps.map((o) => ({ id: o.id, title: o.title, companyId: o.companyId, amount: o.amount }))}
        defaultOpportunityId={searchParams?.opportunityId ?? ""}
      />
    </div>
  );
}
