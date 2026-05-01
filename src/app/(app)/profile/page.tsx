import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { type Locale } from "@/lib/i18n";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  SALES_MANAGER: "Sales Manager",
  SALES_REP: "Sales Representative",
  FINANCE: "Finance",
  MARKETING: "Marketing",
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-700",
  SALES_MANAGER: "bg-emerald-100 text-emerald-700",
  SALES_REP: "bg-sky-100 text-sky-700",
  FINANCE: "bg-amber-100 text-amber-700",
  MARKETING: "bg-rose-100 text-rose-700",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

export default async function ProfilePage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true, email: true, name: true, role: true, locale: true, image: true,
      googleId: true, gmailLastSyncAt: true, createdAt: true,
      _count: {
        select: {
          ownedLeads: true,
          ownedOpportunities: true,
          ownedQuotes: true,
          assignedTasks: true,
          activities: true,
        },
      },
    },
  });

  if (!me) {
    return <div className="card p-6">User not found.</div>;
  }

  const recent = await prisma.activity.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, type: true, body: true, createdAt: true },
  });

  const stats = [
    { label: locale === "ar" ? "العملاء المحتملون" : "Leads", value: me._count.ownedLeads, color: "text-sky-700 bg-sky-50", href: "/leads?owner=me" },
    { label: locale === "ar" ? "الفرص" : "Opportunities", value: me._count.ownedOpportunities, color: "text-emerald-700 bg-emerald-50", href: "/pipeline?owner=me" },
    { label: locale === "ar" ? "عروض الأسعار" : "Quotes", value: me._count.ownedQuotes, color: "text-violet-700 bg-violet-50", href: "/quotes?owner=me" },
    { label: locale === "ar" ? "المهام" : "Tasks", value: me._count.assignedTasks, color: "text-amber-700 bg-amber-50", href: "/tasks?owner=me" },
    { label: locale === "ar" ? "الأنشطة" : "Activities", value: me._count.activities, color: "text-rose-700 bg-rose-50", href: "/activities?owner=me" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{locale === "ar" ? "ملفي الشخصي" : "Your profile"}</h1>
        <p className="text-sm text-ink-500 mt-1">
          {locale === "ar" ? "إدارة الحساب والتفضيلات والأمان" : "Manage your account, preferences and security"}
        </p>
      </div>

      {/* Identity card */}
      <div className="card overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-700 text-white">
          <div className="flex items-center gap-4">
            {me.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.image} alt={me.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-white/30" />
            ) : (
              <span className="w-16 h-16 rounded-full bg-leaf-500 grid place-items-center text-xl font-bold ring-2 ring-white/30">
                {initials(me.name)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold truncate">{me.name}</div>
              <div className="text-[13px] text-white/70 truncate">{me.email}</div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${ROLE_COLOR[me.role] ?? "bg-slate-200 text-slate-700"}`}>
                  {ROLE_LABEL[me.role] ?? me.role}
                </span>
                <span className="text-[11px] text-white/60">
                  · {locale === "ar" ? "العربية" : "English"}
                </span>
                <span className="text-[11px] text-white/60">
                  · {locale === "ar" ? "انضم في" : "Joined"} {new Date(me.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
                </span>
                {me.googleId && (
                  <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                    Google connected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-50 border-t border-slate-100">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className={`rounded-lg px-3 py-2 transition hover:shadow-sm hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-leaf-500/40 ${s.color}`}
            >
              <div className="text-[11px] uppercase tracking-wide font-semibold opacity-80">{s.label}</div>
              <div className="text-2xl font-bold tabular-nums">{s.value}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit form */}
        <div className="lg:col-span-2">
          <ProfileForm
            locale={locale}
            initial={{
              name: me.name,
              localeValue: me.locale,
              image: me.image ?? "",
            }}
          />
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-header">
            <span>{locale === "ar" ? "آخر الأنشطة" : "Recent activity"}</span>
          </div>
          <div className="p-3">
            {recent.length === 0 ? (
              <div className="text-sm text-ink-500 px-2 py-6 text-center">
                {locale === "ar" ? "لا توجد أنشطة بعد" : "No activity yet"}
              </div>
            ) : (
              <ul className="space-y-2">
                {recent.map((a) => (
                  <li key={a.id} className="px-2 py-2 rounded-md hover:bg-slate-50">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{a.type}</div>
                    <div className="text-sm text-ink-800 truncate">{a.body || "—"}</div>
                    <div className="text-[11px] text-ink-400 mt-0.5">{new Date(a.createdAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
