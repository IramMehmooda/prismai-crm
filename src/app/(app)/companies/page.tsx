import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";

const grads = ["bg-grad-aurora", "bg-grad-brand", "bg-grad-sunset", "bg-grad-mint"];

export default async function CompaniesPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: true, _count: { select: { contacts: true, leads: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t(locale, "companies")}</h1>
          <p className="text-sm text-slate-500 mt-1">{companies.length} {locale === "ar" ? "شركة" : "accounts"}</p>
        </div>
        <Link href="/companies/new" className="btn-primary"><Icon name="plus" size={16}/> {t(locale, "newCompany")}</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {companies.map((c, i) => (
          <Link key={c.id} href={`/companies/${c.id}`} className="card p-5 hover:shadow-glow transition relative overflow-hidden block cursor-pointer group">
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30 blur-2xl ${grads[i % grads.length]}`}/>
            <div className="flex items-center gap-3 relative">
              <div className={`avatar w-12 h-12 ${grads[i % grads.length]} text-base`}>
                {c.name.split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                {c.nameAr && <div className="text-xs text-slate-500 truncate">{c.nameAr}</div>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {c.industry && <span className="pill bg-slate-100 text-slate-700"><Icon name="briefcase" size={12}/> {c.industry}</span>}
              {c.region && <span className="pill bg-brand-50 text-brand-700"><Icon name="building" size={12}/> {c.region}</span>}
              {c.size && <span className="pill bg-emerald-50 text-emerald-700">{c.size}</span>}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 py-2.5">
                <div className="text-lg font-bold text-slate-900">{c._count.contacts}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{t(locale, "contacts")}</div>
              </div>
              <div className="rounded-xl bg-slate-50 py-2.5">
                <div className="text-lg font-bold text-slate-900">{c._count.leads}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{t(locale, "leads")}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>{c.owner?.name ?? "—"}</span>
              {c.vatNumber && <span className="font-mono">VAT {c.vatNumber.slice(-6)}</span>}
            </div>
          </Link>
        ))}
        {companies.length === 0 && <div className="text-center text-slate-500 py-12 col-span-full">No companies yet.</div>}
      </div>
    </div>
  );
}
