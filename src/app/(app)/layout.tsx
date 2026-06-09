import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/Icon";
import SidebarNav from "@/components/SidebarNav";
import Breadcrumbs from "@/components/Breadcrumbs";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationsBell from "@/components/NotificationsBell";
import UserMenu from "@/components/UserMenu";

export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = (session.locale as Locale) ?? "en";

  const nav: { href: string; label: string; icon: IconName }[] = [
    { href: "/dashboard", label: t(locale, "dashboard"), icon: "dashboard" },
    { href: "/dashboard/statistics", label: "Statistics", icon: "trend-up" },
    { href: "/leads", label: t(locale, "leads"), icon: "leads" },
    { href: "/pipeline", label: t(locale, "pipeline"), icon: "kanban" },
    { href: "/tasks", label: t(locale, "tasks"), icon: "tasks" },
    { href: "/quotes", label: t(locale, "quotes"), icon: "quote" },
    { href: "/contacts", label: t(locale, "contacts"), icon: "contacts" },
    { href: "/companies", label: t(locale, "companies"), icon: "companies" },
    { href: "/products", label: t(locale, "products"), icon: "product" },
    { href: "/campaigns", label: t(locale, "campaigns"), icon: "campaign" },
    { href: "/activities", label: t(locale, "activities"), icon: "activities" },
    { href: "/settings", label: t(locale, "settings"), icon: "settings" },
  ];

  const initials = session.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen flex bg-[var(--bg)]">
      {/* ---------- Sidebar ---------- */}
      <aside className="w-64 shrink-0 sticky top-0 h-screen flex flex-col bg-nav-800 text-white">
        {/* Logo */}
        <div className="px-5 h-14 flex items-center gap-2 border-b border-white/5">
          <div className="w-7 h-7 rounded-md bg-leaf-500 grid place-items-center font-black text-[13px]">p</div>
          <div className="text-[15px] font-semibold tracking-tight">prismAI</div>
        </div>

        {/* Switch project CTA */}
        <div className="px-3 pt-3">
          <Link href="/leads/new" className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-leaf-500 hover:bg-leaf-600 text-white text-sm font-medium px-3 py-2 shadow-glow transition">
            <Icon name="plus" size={14}/> {t(locale, "newLead")}
          </Link>
        </div>

        {/* Nav */}
        <SidebarNav items={nav} />
      </aside>

      {/* ---------- Main ---------- */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top dark bar */}
        <header className="h-14 bg-topbar text-white flex items-center px-5 gap-4 shadow-sm">
          <button className="lg:hidden text-white/80 hover:text-white"><Icon name="menu"/></button>
          <div className="hidden md:flex items-center gap-2 text-[13px] text-white/80">
            <Icon name="lightning" size={14}/> Activity
          </div>
          <div className="flex-1" />
          <GlobalSearch />
          <a href={`/api/auth/locale?to=${locale === "ar" ? "en" : "ar"}`} className="text-[12px] text-white/80 hover:text-white inline-flex items-center gap-1">
            <Icon name="globe" size={14}/> {locale === "ar" ? "EN" : "AR"}
          </a>
          <NotificationsBell />
          <UserMenu name={session.name} email={session.email} role={session.role} locale={locale} initials={initials} />
          <a
            href="/api/auth/logout"
            title="Sign out"
            className="inline-grid place-items-center w-8 h-8 rounded text-white/70 hover:text-white hover:bg-rose-500/30 transition"
          >
            <Icon name="logout" size={16} />
          </a>
        </header>

        {/* Breadcrumb white bar */}
        <div className="h-11 bg-white border-b border-ink-200 flex items-center px-6 gap-2">
          <Link href="/dashboard" className="crumb"><Icon name="dashboard" size={14}/> Home</Link>
          <Breadcrumbs />
        </div>

        {/* Page content */}
        <div className="flex-1 p-6 lg:p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
