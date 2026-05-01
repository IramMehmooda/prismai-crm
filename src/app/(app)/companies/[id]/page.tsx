import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatSAR, t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";
import DeleteEntityButton from "@/components/DeleteEntityButton";

const grads = ["bg-grad-brand", "bg-grad-aurora", "bg-grad-mint", "bg-grad-sunset"];

function statusTone(s: string) {
  switch (s) {
    case "NEW": return "bg-slate-100 text-slate-700";
    case "CONTACTED": return "bg-sky-100 text-sky-700";
    case "QUALIFIED": return "bg-emerald-100 text-emerald-700";
    case "DISQUALIFIED": return "bg-rose-100 text-rose-700";
    default: return "bg-slate-100 text-slate-700";
  }
}

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { name: true } },
      contacts: {
        orderBy: { createdAt: "desc" },
        include: { owner: { select: { name: true } } },
      },
      leads: {
        orderBy: { createdAt: "desc" },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          owner: { select: { name: true } },
        },
      },
    },
  });

  if (!company) notFound();

  const totalLeadValue = company.leads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
  const initials = company.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back link */}
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Link href="/companies" className="crumb">
          <Icon name="chevron-left" size={14} />
          {t(locale, "companies")}
        </Link>
      </div>

      {/* Company header card */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 blur-3xl bg-grad-brand" />
        <div className="flex items-start gap-5 relative">
          <div className="avatar w-16 h-16 bg-grad-brand text-lg shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            {company.nameAr && <p className="text-sm text-slate-500">{company.nameAr}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {company.industry && (
                <span className="pill bg-slate-100 text-slate-700"><Icon name="briefcase" size={12} /> {company.industry}</span>
              )}
              {company.region && (
                <span className="pill bg-brand-50 text-brand-700"><Icon name="building" size={12} /> {company.region}</span>
              )}
              {company.size && (
                <span className="pill bg-emerald-50 text-emerald-700">{company.size}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/companies/${company.id}/edit`} className="btn-outline text-sm">
              <Icon name="edit" size={14} /> {locale === "ar" ? "تعديل" : "Edit"}
            </Link>
            <DeleteEntityButton
              endpoint={`/api/companies/${company.id}`}
              redirectTo="/companies"
              confirmText={locale === "ar" ? "حذف هذه الشركة؟" : "Delete this company?"}
              label={locale === "ar" ? "حذف" : "Delete"}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">
              {locale === "ar" ? "الموقع الإلكتروني" : "Website"}
            </div>
            {company.website ? (
              <a href={company.website} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline truncate block">
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            ) : <span className="text-ink-400">—</span>}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">
              {locale === "ar" ? "رقم ضريبي" : "VAT Number"}
            </div>
            <span className="font-mono text-ink-700">{company.vatNumber ?? "—"}</span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">
              {locale === "ar" ? "المسؤول" : "Owner"}
            </div>
            <span className="text-ink-700">{company.owner?.name ?? "—"}</span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">
              {locale === "ar" ? "تاريخ الإنشاء" : "Created"}
            </div>
            <span className="text-ink-700">{company.createdAt.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB")}</span>
          </div>
        </div>

        {/* KPI row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-slate-50 py-3 text-center">
            <div className="text-xl font-bold text-slate-900">{company.contacts.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{t(locale, "contacts")}</div>
          </div>
          <div className="rounded-xl bg-slate-50 py-3 text-center">
            <div className="text-xl font-bold text-slate-900">{company.leads.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{t(locale, "leads")}</div>
          </div>
          <div className="rounded-xl bg-brand-50 py-3 text-center sm:col-span-2">
            <div className="text-xl font-bold text-brand-700">{formatSAR(totalLeadValue, locale)}</div>
            <div className="text-[10px] uppercase tracking-wider text-brand-400">{locale === "ar" ? "إجمالي قيمة الفرص" : "Total Lead Value"}</div>
          </div>
        </div>
      </div>

      {/* Contacts section */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Icon name="users" size={18} className="text-leaf-600" />
          {t(locale, "contacts")}
          <span className="ml-1 text-[11px] font-semibold bg-leaf-100 text-leaf-700 px-2 py-0.5 rounded-full">
            {company.contacts.length}
          </span>
        </h2>
        <div className="card overflow-hidden">
          <table className="table-modern">
            <thead>
              <tr>
                <th>{t(locale, "name")}</th>
                <th>{t(locale, "title")}</th>
                <th>{t(locale, "email")}</th>
                <th>{t(locale, "phone")}</th>
                <th>{t(locale, "owner")}</th>
              </tr>
            </thead>
            <tbody>
              {company.contacts.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-3 group/link">
                      <span className={`avatar w-8 h-8 ${grads[i % grads.length]} text-[10px]`}>
                        {`${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase()}
                      </span>
                      <div>
                        <div className="font-semibold text-brand-700 group-hover/link:underline">{c.firstName} {c.lastName}</div>
                        {c.nameAr && <div className="text-xs text-slate-500">{c.nameAr}</div>}
                      </div>
                    </Link>
                  </td>
                  <td>{c.title ?? "—"}</td>
                  <td>
                    {c.email ? (
                      <a className="inline-flex items-center gap-1.5 text-brand-700 hover:underline" href={`mailto:${c.email}`}>
                        <Icon name="mail" size={13} /> {c.email}
                      </a>
                    ) : "—"}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {c.phone && <span className="pill bg-slate-100 text-slate-700"><Icon name="phone" size={12} /> {c.phone}</span>}
                      {c.whatsapp && <span className="pill bg-emerald-100 text-emerald-700"><Icon name="whatsapp" size={12} /> WA</span>}
                    </div>
                  </td>
                  <td>{c.owner?.name ?? "—"}</td>
                </tr>
              ))}
              {company.contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    {locale === "ar" ? "لا توجد جهات اتصال لهذه الشركة." : "No contacts for this company yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leads section */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Icon name="target" size={18} className="text-brand-600" />
          {t(locale, "leads")}
          <span className="ml-1 text-[11px] font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
            {company.leads.length}
          </span>
        </h2>
        <div className="card overflow-hidden">
          <table className="table-modern">
            <thead>
              <tr>
                <th>{t(locale, "title")}</th>
                <th>{t(locale, "contact")}</th>
                <th>{t(locale, "source")}</th>
                <th>{t(locale, "status")}</th>
                <th className="text-end">{t(locale, "value")}</th>
                <th>{t(locale, "owner")}</th>
              </tr>
            </thead>
            <tbody>
              {company.leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link href={`/leads/${l.id}`} className="font-semibold text-brand-700 hover:underline">
                      {l.title}
                    </Link>
                  </td>
                  <td>
                    {l.contact ? (
                      <Link href={`/contacts/${l.contact.id}`} className="text-brand-700 hover:underline">
                        {l.contact.firstName} {l.contact.lastName}
                      </Link>
                    ) : "—"}
                  </td>
                  <td><span className="pill bg-slate-100 text-slate-700">{l.source}</span></td>
                  <td>
                    <span className={`pill ${statusTone(l.status)}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {l.status}
                    </span>
                  </td>
                  <td className="text-end font-semibold tabular-nums">{formatSAR(l.estimatedValue, locale)}</td>
                  <td>{l.owner?.name ?? "—"}</td>
                </tr>
              ))}
              {company.leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    {locale === "ar" ? "لا توجد فرص لهذه الشركة." : "No leads for this company yet."}
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
