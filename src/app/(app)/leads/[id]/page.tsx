import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatSAR, t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";
import DeleteEntityButton from "@/components/DeleteEntityButton";

export const dynamic = "force-dynamic";
function statusTone(status: string) {
  switch (status) {
    case "NEW":
      return "bg-slate-100 text-slate-700";
    case "CONTACTED":
      return "bg-sky-100 text-sky-700";
    case "QUALIFIED":
      return "bg-emerald-100 text-emerald-700";
    case "DISQUALIFIED":
      return "bg-rose-100 text-rose-700";
    case "CONVERTED":
      return "bg-violet-100 text-violet-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      owner: { select: { name: true } },
    },
  });

  if (!lead) notFound();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Link href="/leads" className="crumb">
          <Icon name="chevron-left" size={14} />
          {t(locale, "leads")}
        </Link>
      </div>

      <div className="card p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 blur-3xl bg-grad-sunset" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{lead.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={`pill ${statusTone(lead.status)}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {lead.status}
                </span>
                <span className="pill bg-slate-100 text-slate-700">{lead.source}</span>
                <span className="pill bg-brand-50 text-brand-700">{t(locale, "score")}: {lead.score}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 flex-wrap justify-end">
              <div className="rounded-xl bg-brand-50 px-4 py-3 text-center min-w-[180px]">
                <div className="text-xl font-bold text-brand-700">{formatSAR(lead.estimatedValue, locale)}</div>
                <div className="text-[10px] uppercase tracking-wider text-brand-400">{t(locale, "value")}</div>
              </div>
              <Link href={`/leads/${lead.id}/edit`} className="btn-outline text-sm">
                <Icon name="edit" size={14} /> {locale === "ar" ? "تعديل" : "Edit"}
              </Link>
              <DeleteEntityButton
                endpoint={`/api/leads/${lead.id}`}
                redirectTo="/leads"
                confirmText={locale === "ar" ? "حذف هذا العميل المحتمل؟" : "Delete this lead?"}
                label={locale === "ar" ? "حذف" : "Delete"}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{t(locale, "company")}</div>
              {lead.company ? (
                <Link href={`/companies/${lead.company.id}`} className="text-brand-700 hover:underline">
                  {lead.company.name}
                </Link>
              ) : <span className="text-ink-400">—</span>}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{t(locale, "contact")}</div>
              {lead.contact ? (
                <Link href={`/contacts/${lead.contact.id}`} className="text-brand-700 hover:underline">
                  {lead.contact.firstName} {lead.contact.lastName}
                </Link>
              ) : <span className="text-ink-400">—</span>}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{t(locale, "owner")}</div>
              <span className="text-ink-700">{lead.owner?.name ?? "—"}</span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">Auto Score</div>
              <span className="text-ink-700">{lead.scoreAuto}</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "تاريخ الإنشاء" : "Created"}</div>
              <span className="text-ink-700">{lead.createdAt.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB")}</span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "آخر تحديث" : "Updated"}</div>
              <span className="text-ink-700">{lead.updatedAt.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB")}</span>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2">Notes</div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-ink-700 min-h-[88px] whitespace-pre-wrap">
              {lead.notes?.trim() || (locale === "ar" ? "لا توجد ملاحظات." : "No notes yet.")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}