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

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";

  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { name: true } },
      leads: {
        orderBy: { createdAt: "desc" },
        include: { owner: { select: { name: true } } },
      },
    },
  });

  if (!contact) notFound();

  const fullName = `${contact.firstName} ${contact.lastName}`;
  const initials = `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Link href="/contacts" className="crumb">
          <Icon name="chevron-left" size={14} />
          {t(locale, "contacts")}
        </Link>
      </div>

      <div className="card p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 blur-3xl bg-grad-aurora" />
        <div className="flex items-start gap-5 relative">
          <div className="avatar w-16 h-16 bg-grad-aurora text-lg shrink-0">{initials}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
            {contact.nameAr && <p className="text-sm text-slate-500">{contact.nameAr}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {contact.title && <span className="pill bg-slate-100 text-slate-700">{contact.title}</span>}
              {contact.company && (
                <Link href={`/companies/${contact.company.id}`} className="pill bg-brand-50 text-brand-700 hover:underline">
                  <Icon name="building" size={12} /> {contact.company.name}
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/contacts/${contact.id}/edit`} className="btn-outline text-sm">
              <Icon name="edit" size={14} /> {locale === "ar" ? "تعديل" : "Edit"}
            </Link>
            <DeleteEntityButton
              endpoint={`/api/contacts/${contact.id}`}
              redirectTo="/contacts"
              confirmText={locale === "ar" ? "حذف جهة الاتصال هذه؟" : "Delete this contact?"}
              label={locale === "ar" ? "حذف" : "Delete"}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{t(locale, "email")}</div>
            {contact.email ? (
              <a href={`mailto:${contact.email}`} className="text-brand-700 hover:underline break-all">{contact.email}</a>
            ) : <span className="text-ink-400">—</span>}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{t(locale, "phone")}</div>
            <span className="text-ink-700">{contact.phone ?? "—"}</span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">WhatsApp</div>
            <span className="text-ink-700">{contact.whatsapp ?? "—"}</span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{t(locale, "owner")}</div>
            <span className="text-ink-700">{contact.owner?.name ?? "—"}</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Icon name="target" size={18} className="text-brand-600" />
          {t(locale, "leads")}
          <span className="ml-1 text-[11px] font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
            {contact.leads.length}
          </span>
        </h2>
        <div className="card overflow-hidden">
          <table className="table-modern">
            <thead>
              <tr>
                <th>{t(locale, "title")}</th>
                <th>{t(locale, "source")}</th>
                <th>{t(locale, "status")}</th>
                <th className="text-end">{t(locale, "value")}</th>
                <th>{t(locale, "owner")}</th>
              </tr>
            </thead>
            <tbody>
              {contact.leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link href={`/leads/${lead.id}`} className="font-semibold text-brand-700 hover:underline">
                      {lead.title}
                    </Link>
                  </td>
                  <td><span className="pill bg-slate-100 text-slate-700">{lead.source}</span></td>
                  <td>
                    <span className={`pill ${statusTone(lead.status)}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {lead.status}
                    </span>
                  </td>
                  <td className="text-end font-semibold tabular-nums">{formatSAR(lead.estimatedValue, locale)}</td>
                  <td>{lead.owner?.name ?? "—"}</td>
                </tr>
              ))}
              {contact.leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    {locale === "ar" ? "لا توجد فرص مرتبطة بجهة الاتصال." : "No leads linked to this contact yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}