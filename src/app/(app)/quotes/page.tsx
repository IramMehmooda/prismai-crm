import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getVisibleScope, ownerWhere } from "@/lib/scope";
import { formatSAR, t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";
import OwnerToggle from "@/components/OwnerToggle";

export const dynamic = "force-dynamic";

export default async function QuotesPage({ searchParams }: { searchParams?: { owner?: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const mineOnly = searchParams?.owner === "me";
  const scope = await getVisibleScope(session);
  const quotes = await prisma.quote.findMany({
    where: ownerWhere(scope, "ownerId", mineOnly, session.sub),
    include: { company: true, contact: true, opportunity: true, owner: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{t(locale, "quotes")}</h1>
          <p className="text-sm text-ink-500 mt-1">
            {quotes.length} · {formatSAR(quotes.reduce((a, q) => a + q.totalSar, 0), locale)} {locale === "ar" ? "إجمالي" : "total"}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <OwnerToggle mineOnly={mineOnly} basePath="/quotes" locale={locale} />
          <Link href="/quotes/new" className="btn-primary"><Icon name="plus" size={14}/> {t(locale, "newQuote")}</Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="table-modern">
          <thead>
            <tr>
              <th>#</th>
              <th>{t(locale, "company")}</th>
              <th>{locale === "ar" ? "الفرصة" : "Opportunity"}</th>
              <th>{t(locale, "status")}</th>
              <th className="text-end">{t(locale, "total")}</th>
              <th>{t(locale, "owner")}</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="cursor-pointer">
                <td><Link href={`/quotes/${q.id}`} className="font-mono text-[12.5px] font-semibold text-leaf-600 hover:underline">{q.number}</Link></td>
                <td>
                  <div className="font-medium text-ink-700">{q.company?.name ?? "—"}</div>
                  {q.contact && <div className="text-[11px] text-ink-400">{q.contact.firstName} {q.contact.lastName}</div>}
                </td>
                <td className="text-[12.5px] text-ink-500">{q.opportunity?.title ?? "—"}</td>
                <td><span className={`pill ${quoteTone(q.status)}`}>{q.status}</span></td>
                <td className="text-end font-semibold tabular-nums">{formatSAR(q.totalSar, locale)}</td>
                <td className="text-[12px] text-ink-500">{q.owner?.name ?? "—"}</td>
              </tr>
            ))}
            {quotes.length === 0 && <tr><td colSpan={6} className="text-center text-ink-400 py-12">No quotes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function quoteTone(s: string) {
  switch (s) {
    case "DRAFT": return "bg-ink-100 text-ink-600";
    case "PENDING_APPROVAL": return "bg-amber-100 text-amber-700";
    case "APPROVED": return "bg-leaf-100 text-leaf-700";
    case "REJECTED": return "bg-rose-100 text-rose-700";
    case "SENT": return "bg-sky-100 text-sky-700";
    case "ACCEPTED": return "bg-emerald-100 text-emerald-700";
    case "DECLINED": return "bg-rose-100 text-rose-700";
    case "EXPIRED": return "bg-ink-100 text-ink-500";
    default: return "bg-ink-100 text-ink-600";
  }
}
