import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatSAR, t, type Locale } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/Icon";
import { LineChart, BarsVertical, MiniCalendar } from "@/components/Charts";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"] as const;

export default async function DashboardPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const today = todayDateKey();

  const [
    openLeads, qualifiedLeads, totalLeads, totalContacts,
    pipelineAgg, weekActivities, recentLeads, recentActivities,
    leadsByStatus, activities30,
    overdueTasks, oppByStage, openOppValueAgg,
  ] = await Promise.all([
    prisma.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } } }),
    prisma.lead.count({ where: { status: "QUALIFIED" } }),
    prisma.lead.count(),
    prisma.contact.count(),
    prisma.lead.aggregate({
      _sum: { estimatedValue: true },
      where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } },
    }),
    prisma.activity.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { company: true, owner: true } }),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { user: true } }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.activity.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 12 * 30 * 24 * 3600 * 1000) } },
      select: { createdAt: true },
    }),
    prisma.task.count({ where: { status: "OPEN", dueAt: { lt: today } } }),
    prisma.opportunity.findMany({ where: { stage: { isWon: false, isLost: false } }, include: { stage: true } }),
    prisma.opportunity.aggregate({ _sum: { amount: true }, where: { stage: { isWon: false, isLost: false } } }),
  ]);

  const stageBuckets = new Map<string, { name: string; color: string; count: number; sum: number; order: number }>();
  for (const o of oppByStage) {
    const k = o.stage.id;
    const cur = stageBuckets.get(k) ?? { name: o.stage.name, color: o.stage.color ?? "", count: 0, sum: 0, order: o.stage.order };
    cur.count += 1; cur.sum += o.amount;
    stageBuckets.set(k, cur);
  }
  const stagesArr = [...stageBuckets.values()].sort((a, b) => a.order - b.order);
  const maxStageSum = Math.max(1, ...stagesArr.map((s) => s.sum));
  const openOppValue = openOppValueAgg._sum.amount ?? 0;

  // 12-month line chart series
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (11 - i));
    return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", { month: "short" }) };
  });
  const monthSeries = months.map((mm) => activities30.filter((a) => a.createdAt.getFullYear() === mm.y && a.createdAt.getMonth() === mm.m).length);

  // Bar series for "Data graph" (last 14 days)
  const days = 14;
  const daySeries = Array.from({ length: days }, (_, i) => {
    const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - (days - 1 - i));
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return activities30.filter((a) => a.createdAt >= start && a.createdAt < end).length;
  });

  const stageCounts = STATUSES.map((s) => ({
    label: s.charAt(0) + s.slice(1).toLowerCase(),
    value: leadsByStatus.find((g) => g.status === s)?._count._all ?? 0,
  }));

  const pipelineValue = pipelineAgg._sum.estimatedValue ?? 0;
  const conversion = totalLeads ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  // KPI tiles in Notebook style: round colored icon left, big number + label right
  const tiles: { icon: IconName; bg: string; label: string; value: string | number; href: string }[] = [
    { icon: "leads",      bg: "bg-accent-sky",    label: t(locale, "openLeads"),         value: openLeads, href: "/leads" },
    { icon: "trend-up",   bg: "bg-leaf-500",      label: t(locale, "qualifiedLeads"),    value: qualifiedLeads, href: "/leads" },
    { icon: "lightning",  bg: "bg-accent-orange", label: t(locale, "activitiesThisWeek"), value: weekActivities, href: "/activities" },
    { icon: "clock",      bg: "bg-accent-red",    label: locale === "ar" ? "مهام متأخرة" : "Overdue tasks", value: overdueTasks, href: "/tasks" },
  ];

  // Recent activities → highlight today's calendar
  const todayHighlights = activities30
    .filter((a) => a.createdAt.getMonth() === new Date().getMonth())
    .map((a) => a.createdAt.getDate());

  return (
    <div className="space-y-6">
      {/* Workset header */}
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{locale === "ar" ? "مساحة العمل" : "Workset"}</h1>
        <p className="text-sm text-ink-500 mt-1">
          {locale === "ar" ? "مرحبًا بعودتك" : "Welcome back"}, <span className="text-ink-700 font-medium">{session.name.split(" ")[0]}</span>
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {tiles.map((s) => (
          <Link key={s.label} href={s.href} className="kpi hover:shadow-lg transition cursor-pointer">
            <div className={`kpi-icon ${s.bg}`}><Icon name={s.icon} size={20}/></div>
            <div>
              <div className="kpi-number">{typeof s.value === "number" ? s.value.toLocaleString(locale === "ar" ? "ar-SA" : "en-SA") : s.value}</div>
              <div className="kpi-label">{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main row: Statistics (line) + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics line chart */}
        <Link href="/activities" className="card lg:col-span-2 hover:shadow-lg transition cursor-pointer block">
          <div className="card-header">
            <span>{locale === "ar" ? "الإحصائيات" : "Statistics"}</span>
            <span className="text-[12px] text-leaf-600 hover:underline">{locale === "ar" ? "عرض الكل" : "View all"}</span>
          </div>
          <div className="card-body">
            <LineChart data={monthSeries} labels={months.map((m) => m.label)} />
          </div>
        </Link>

        {/* Data graph */}
        <Link href="/pipeline" className="card hover:shadow-lg transition cursor-pointer block">
          <div className="card-header">
            <span>{locale === "ar" ? "بيانات الفرص" : "Data graph"}</span>
            <span className="text-[11px] text-ink-400">{locale === "ar" ? "آخر ١٤ يومًا" : "Last 14d"}</span>
          </div>
          <div className="card-body">
            <div className="text-xl font-bold text-ink-900">{formatSAR(pipelineValue, locale)}</div>
            <div className="text-[12px] text-leaf-600 font-medium mb-3">+12.4% <span className="text-ink-400 font-normal">{locale === "ar" ? "هذا الشهر" : "this month"}</span></div>
            <BarsVertical data={daySeries} />
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div>
                <div className="text-sm font-bold text-ink-900">{stageCounts.find((s) => s.label === "New")?.value ?? 0}</div>
                <div className="text-[10px] uppercase tracking-wider text-ink-400">{locale === "ar" ? "جديد" : "New"}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-ink-900">{stageCounts.find((s) => s.label === "Contacted")?.value ?? 0}</div>
                <div className="text-[10px] uppercase tracking-wider text-ink-400">{locale === "ar" ? "اتصلنا" : "Contacted"}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-leaf-600">{conversion}%</div>
                <div className="text-[10px] uppercase tracking-wider text-ink-400">{locale === "ar" ? "تأهيل" : "Qualified"}</div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Inline stat strip (Workset numbers row) */}
      <div className="card grid grid-cols-2 sm:grid-cols-4 divide-x divide-ink-100">
        {[
          { v: totalLeads.toLocaleString(), l: locale === "ar" ? "إجمالي الفرص" : "Total Leads", href: "/leads" },
          { v: totalContacts.toLocaleString(), l: locale === "ar" ? "جهات الاتصال" : "Contacts", href: "/contacts" },
          { v: stageCounts.reduce((a, b) => a + (b.label === "Converted" ? b.value : 0), 0).toLocaleString(), l: locale === "ar" ? "محول" : "Converted", href: "/leads" },
          { v: weekActivities.toLocaleString(), l: locale === "ar" ? "أنشطة الأسبوع" : "This Week", href: "/activities" },
        ].map((x) => (
          <Link key={x.l} href={x.href} className="px-5 py-4 text-center hover:bg-leaf-50 transition cursor-pointer block">
            <div className="text-xl font-bold text-ink-900 tabular-nums">{x.v}</div>
            <div className="text-[11px] uppercase tracking-wider text-ink-400 mt-1 font-semibold">{x.l}</div>
          </Link>
        ))}
      </div>

      {/* Deals by stage */}
      <Link href="/pipeline" className="card hover:shadow-lg transition cursor-pointer block">
        <div className="card-header">
          <span>{locale === "ar" ? "الصفقات حسب المرحلة" : "Deals by stage"}</span>
          <span className="text-[12px] text-leaf-600 hover:underline">{locale === "ar" ? "افتح الكانبان" : "Open kanban"}</span>
        </div>
        <div className="card-body space-y-3">
          <div className="text-xl font-bold text-ink-900">{formatSAR(openOppValue, locale)} <span className="text-[12px] text-ink-400 font-normal">{locale === "ar" ? "خط أنابيب مفتوح" : "open pipeline"}</span></div>
          <div className="space-y-2">
            {stagesArr.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="font-medium text-ink-700">{s.name}</span>
                  <span className="tabular-nums text-ink-500">{s.count} · {formatSAR(s.sum, locale)}</span>
                </div>
                <div className="h-2 bg-ink-100 rounded overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${(s.sum / maxStageSum) * 100}%`, background: s.color }}/>
                </div>
              </div>
            ))}
            {stagesArr.length === 0 && <div className="text-ink-400 text-sm">{locale === "ar" ? "لا توجد صفقات مفتوحة" : "No open deals"}</div>}
          </div>
        </div>
      </Link>

      {/* Bottom row: Todos + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Todos = recent leads */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <span>{locale === "ar" ? "المهام" : "Todos"}</span>
            <Link href="/leads" className="text-[12px] text-leaf-600 hover:underline">{locale === "ar" ? "كل الفرص" : "All leads"}</Link>
          </div>
          <ul className="divide-y divide-ink-100">
            {recentLeads.map((l) => (
              <Link key={l.id} href={`/leads/${l.id}`} className="block px-5 py-3 flex items-center gap-3 hover:bg-leaf-50 transition">
                <span className="w-4 h-4 rounded border border-ink-300 grid place-items-center bg-white">
                  {l.status === "QUALIFIED" || l.status === "CONVERTED" ? <Icon name="check" size={12} className="text-leaf-600"/> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-[13.5px] truncate ${l.status === "CONVERTED" ? "line-through text-ink-400" : "text-ink-700"}`}>{l.title}</div>
                  <div className="text-[11px] text-ink-400 truncate">{l.company?.name ?? "—"}</div>
                </div>
                <span className={`pill ${statusTone(l.status)}`}>{l.status}</span>
                <div className="hidden sm:block w-24 text-end text-[12px] font-semibold text-ink-700 tabular-nums">{formatSAR(l.estimatedValue, locale)}</div>
              </Link>
            ))}
            {recentLeads.length === 0 && <li className="px-5 py-8 text-center text-ink-400 text-sm">No leads yet.</li>}
          </ul>
        </div>

        {/* Calendar */}
        <div className="card">
          <div className="card-header">
            <span>{locale === "ar" ? "التقويم" : "Calendar"}</span>
            <Link href="/activities" className="text-[12px] text-leaf-600 hover:underline">{locale === "ar" ? "الأنشطة" : "Activities"}</Link>
          </div>
          <div className="card-body">
            <MiniCalendar locale={locale} highlights={todayHighlights} />
            <ul className="mt-5 space-y-3">
              {recentActivities.slice(0, 4).map((a) => (
                <li key={a.id} className="flex gap-3 text-[12.5px]">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${activityDot(a.type)}`}/>
                  <div className="min-w-0 flex-1">
                    <div className="text-ink-700 truncate">{a.subject}</div>
                    <div className="text-[11px] text-ink-400">{a.user?.name} · {new Date(a.createdAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium", timeStyle: "short" })}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function todayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statusTone(s: string) {
  switch (s) {
    case "NEW": return "bg-ink-100 text-ink-600";
    case "CONTACTED": return "bg-sky-100 text-sky-700";
    case "QUALIFIED": return "bg-leaf-100 text-leaf-700";
    case "DISQUALIFIED": return "bg-rose-100 text-rose-700";
    case "CONVERTED": return "bg-violet-100 text-violet-700";
    default: return "bg-ink-100 text-ink-600";
  }
}
function activityDot(t: string) {
  switch (t) {
    case "CALL": return "bg-leaf-500";
    case "EMAIL": return "bg-accent-sky";
    case "WHATSAPP": return "bg-accent-teal";
    case "MEETING": return "bg-accent-violet";
    case "STATUS_CHANGE": return "bg-accent-orange";
    default: return "bg-ink-400";
  }
}
