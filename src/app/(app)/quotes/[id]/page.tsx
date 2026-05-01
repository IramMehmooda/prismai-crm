import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatSAR, t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";
import QuoteActions from "./QuoteActions";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { order: "asc" } },
      company: true, contact: true, opportunity: true, owner: true,
      approvals: { include: { requestedBy: true, decidedBy: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!quote) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold">{t(locale, "quote")}</div>
          <h1 className="text-2xl font-bold text-ink-900">{quote.number} <span className="text-ink-400 font-normal text-base">v{quote.version}</span></h1>
          <p className="text-sm text-ink-500 mt-1">{quote.company?.name ?? "—"} · {quote.opportunity?.title ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pill ${quoteTone(quote.status)}`}>{quote.status.replace("_", " ")}</span>
          <a href={`/quotes/${quote.id}/print`} target="_blank" className="btn-outline"><Icon name="quote" size={14}/> {t(locale, "print")}</a>
          <QuoteActions id={quote.id} status={quote.status} role={session.role} locale={locale} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 overflow-hidden">
          <table className="table-modern">
            <thead>
              <tr>
                <th>{locale === "ar" ? "البند" : "Description"}</th>
                <th className="text-end">{locale === "ar" ? "كمية" : "Qty"}</th>
                <th className="text-end">{locale === "ar" ? "سعر" : "Unit"}</th>
                <th className="text-end">{locale === "ar" ? "خصم %" : "Disc %"}</th>
                <th className="text-end">{locale === "ar" ? "الإجمالي" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((it) => (
                <tr key={it.id}>
                  <td className="font-medium text-ink-700">{it.description}</td>
                  <td className="text-end tabular-nums">{it.quantity}</td>
                  <td className="text-end tabular-nums">{formatSAR(it.unitPriceSar, locale)}</td>
                  <td className="text-end tabular-nums">{it.discountPct}%</td>
                  <td className="text-end font-semibold tabular-nums">{formatSAR(it.lineTotal, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="card card-body space-y-2 text-[13px]">
            <Row label={locale === "ar" ? "الإجمالي الفرعي" : "Subtotal"} value={formatSAR(quote.subtotalSar, locale)} />
            <Row label={locale === "ar" ? "الخصم" : "Discount"} value={`- ${formatSAR(quote.discountSar, locale)}`} tone="text-accent-red"/>
            <Row label={locale === "ar" ? "ضريبة 15%" : "VAT 15%"} value={formatSAR(quote.vatSar, locale)} />
            <div className="border-t border-ink-200 my-2"/>
            <Row label={locale === "ar" ? "الإجمالي" : "Total"} value={formatSAR(quote.totalSar, locale)} bold/>
            {quote.validUntil && <div className="text-[11px] text-ink-400 pt-2">{locale === "ar" ? "صالح حتى" : "Valid until"} {new Date(quote.validUntil).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium" })}</div>}
          </div>

          {quote.approvals.length > 0 && (
            <div className="card">
              <div className="card-header"><span>{locale === "ar" ? "سجل الاعتمادات" : "Approval history"}</span></div>
              <ul className="divide-y divide-ink-100">
                {quote.approvals.map((a) => (
                  <li key={a.id} className="px-5 py-3 text-[12.5px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{a.level}</span>
                      <span className={`pill ${approvalTone(a.status)}`}>{a.status}</span>
                    </div>
                    <div className="text-[11px] text-ink-400 mt-1">
                      {locale === "ar" ? "طلب من" : "Requested by"} {a.requestedBy.name}
                      {a.decidedBy && <> · {locale === "ar" ? "قرّر" : "Decided by"} {a.decidedBy.name}</>}
                    </div>
                    {a.reason && <div className="text-[12px] text-ink-600 mt-1">"{a.reason}"</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href="/quotes" className="text-[12px] text-leaf-600 hover:underline">← {locale === "ar" ? "كل العروض" : "All quotes"}</Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, tone }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-semibold text-ink-900" : "text-ink-500"}>{label}</span>
      <span className={`tabular-nums ${bold ? "text-lg font-bold text-leaf-600" : tone ?? "text-ink-700 font-medium"}`}>{value}</span>
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
function approvalTone(s: string) {
  switch (s) {
    case "PENDING": return "bg-amber-100 text-amber-700";
    case "APPROVED": return "bg-leaf-100 text-leaf-700";
    case "REJECTED": return "bg-rose-100 text-rose-700";
    default: return "bg-ink-100 text-ink-600";
  }
}
