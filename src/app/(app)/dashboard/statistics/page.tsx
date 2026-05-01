/**
 * Statistics Dashboard — prismAI
 * All data is fetched live from Prisma. No hardcoded values.
 * Every chart element is clickable and navigates to the relevant module.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatSAR, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/* ─── palette ─────────────────────────────────── */
const SOURCE_COLORS: Record<string, string> = {
  WEB:        "#2980b9",
  REFERRAL:   "#27ae60",
  TRADE_SHOW: "#f39c12",
  LINKEDIN:   "#0077b5",
  COLD:       "#8e44ad",
  OTHER:      "#7f8c8d",
};
const STATUS_COLORS: Record<string, string> = {
  NEW:          "#2c3e50",
  CONTACTED:    "#2980b9",
  QUALIFIED:    "#27ae60",
  DISQUALIFIED: "#e74c3c",
  CONVERTED:    "#9b59b6",
  NURTURING:    "#1abc9c",
};
const STAGE_COLORS = ["#94a3b8","#2980b9","#8b5cf6","#f59e0b","#1abc9c","#27ae60","#e74c3c"];
const INDUSTRY_COLORS = [
  "#27ae60","#2ecc71","#16a085","#1abc9c",
  "#2980b9","#3498db","#1f9b54","#8b5cf6",
  "#f39c12","#e67e22","#e74c3c","#c0392b",
];
const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   "#e74c3c",
  MEDIUM: "#f39c12",
  LOW:    "#27ae60",
};
const WON_COLOR  = "#27ae60";
const LOST_COLOR = "#e74c3c";

/* ─── Saudi Arabia city coordinates (440×360 SVG) ── */
const CITY_COORDS: Record<string, { x: number; y: number; label: string }> = {
  Eastern:  { x: 355, y: 145, label: "Dammam" },
  Dammam:   { x: 355, y: 145, label: "Dammam" },
  Jubail:   { x: 345, y: 118, label: "Jubail"  },
  Riyadh:   { x: 248, y: 172, label: "Riyadh"  },
  Jeddah:   { x: 93,  y: 240, label: "Jeddah"  },
  Makkah:   { x: 104, y: 255, label: "Makkah"  },
  Madinah:  { x: 108, y: 178, label: "Madinah" },
  Yanbu:    { x: 78,  y: 188, label: "Yanbu"   },
  Tabuk:    { x: 49,  y: 85,  label: "Tabuk"   },
  Abha:     { x: 150, y: 315, label: "Abha"    },
  Khobar:   { x: 363, y: 153, label: "Al Khobar"},
};

/* ─── data fetcher ─────────────────────────────── */
async function getStats() {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  const [
    leadsBySource, leadsByStatus, totalLeads,
    activeOpps, stagesAll,
    wonLostOpps,
    companiesWithOpps,
    tasksByPriority, totalTasks,
    recentActivities,
  ] = await Promise.all([
    prisma.lead.groupBy({ by: ["source"], _count: { _all: true }, orderBy: { _count: { source: "desc" } } }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lead.count(),
    prisma.opportunity.findMany({
      where: { stage: { isWon: false, isLost: false } },
      select: { amount: true, stage: { select: { id: true, name: true, order: true, color: true } } },
    }),
    prisma.pipelineStage.findMany({ where: { isWon: false, isLost: false }, orderBy: { order: "asc" } }),
    prisma.opportunity.findMany({
      where: { stage: { OR: [{ isWon: true }, { isLost: true }] }, closedAt: { gte: yearAgo } },
      select: { amount: true, closedAt: true, stage: { select: { isWon: true } } },
    }),
    prisma.company.findMany({
      select: {
        industry: true,
        region: true,
        opportunities: { select: { amount: true } },
      },
    }),
    prisma.task.groupBy({ by: ["priority"], _count: { _all: true } }),
    prisma.task.count(),
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" }, take: 12,
      select: { id: true, type: true, subject: true, createdAt: true,
        user: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
        lead: { select: { id: true } },
        opportunity: { select: { id: true } },
      },
    }),
  ]);

  /* leads by source */
  const sourceData = leadsBySource.map((g) => ({ label: g.source, value: g._count._all }));

  /* leads by status */
  const statusData = leadsByStatus.map((g) => ({ label: g.status, value: g._count._all }));

  /* deals by stage */
  const stageBuckets = new Map<string, { name: string; sum: number; count: number; order: number; color: string | null }>();
  for (const o of activeOpps) {
    const cur = stageBuckets.get(o.stage.id) ?? { name: o.stage.name, sum: 0, count: 0, order: o.stage.order, color: o.stage.color };
    cur.sum += o.amount; cur.count += 1;
    stageBuckets.set(o.stage.id, cur);
  }
  const dealsByStage = stagesAll.map((s) => stageBuckets.get(s.id) ?? { name: s.name, sum: 0, count: 0, order: s.order, color: s.color });
  const totalPipeline = activeOpps.reduce((s, o) => s + o.amount, 0);

  /* won/lost by month */
  const months: { key: string; label: string; won: number; lost: number }[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short" }), won: 0, lost: 0 };
  });
  for (const o of wonLostOpps) {
    if (!o.closedAt) continue;
    const key = `${o.closedAt.getFullYear()}-${o.closedAt.getMonth()}`;
    const m = months.find((m) => m.key === key);
    if (m) { if (o.stage.isWon) m.won += o.amount; else m.lost += o.amount; }
  }

  /* revenue by industry */
  const industryMap = new Map<string, number>();
  for (const c of companiesWithOpps) {
    const ind = c.industry || "Other";
    const total = c.opportunities.reduce((s, o) => s + o.amount, 0);
    if (total > 0) industryMap.set(ind, (industryMap.get(ind) ?? 0) + total);
  }
  const revenueByIndustry = [...industryMap.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  /* deal locations (region → total amount) */
  const regionMap = new Map<string, number>();
  for (const c of companiesWithOpps) {
    if (!c.region) continue;
    const norm = c.region.trim();
    if (!CITY_COORDS[norm]) continue;
    const total = c.opportunities.reduce((s, o) => s + o.amount, 0);
    if (total > 0) regionMap.set(norm, (regionMap.get(norm) ?? 0) + total);
  }
  const dealLocations = [...regionMap.entries()].map(([region, value]) => ({ region, value, ...CITY_COORDS[region] }));

  /* tasks by priority */
  const PRIORITIES = ["HIGH", "MEDIUM", "LOW"];
  const taskPriorityData = PRIORITIES.map((p) => ({
    label: p,
    value: tasksByPriority.find((g) => g.priority === p)?._count._all ?? 0,
  }));

  return {
    sourceData, statusData, totalLeads,
    dealsByStage, totalPipeline,
    months,
    revenueByIndustry,
    dealLocations,
    taskPriorityData, totalTasks,
    recentActivities,
  };
}

/* ─── page ──────────────────────────────────────── */
export default async function StatisticsPage() {
  const session = (await getSession())!;
  const locale  = (session.locale as Locale) ?? "en";
  const d       = await getStats();
  const totalWon  = d.months.reduce((s, m) => s + m.won, 0);
  const totalLost = d.months.reduce((s, m) => s + m.lost, 0);

  return (
    <div className="space-y-5 pb-8">
      {/* ── header ── */}
      <div>
        <h1 className="text-2xl font-bold text-ink-900">
          {locale === "ar" ? "لوحة الإحصائيات" : "Analytics Dashboard"}
        </h1>
        <p className="text-sm text-ink-400 mt-0.5">
          {locale === "ar" ? "مركز القيادة التشغيلية" : "Operational Command Center — live data from your CRM"}
        </p>
      </div>

      {/* ══ ROW 1: Operational Diagnostics ═══════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Active Leads by Source */}
        <div className="card p-5">
          <SectionHeader
            title={locale === "ar" ? "العملاء المحتملون حسب المصدر" : "Active Leads by Source"}
            sub={locale === "ar" ? "أي قنواتك تولّد استفسارات؟" : "Which channels are generating enquiries?"}
            href="/leads"
            linkLabel="View all leads"
          />
          <LeadsBySourceChart data={d.sourceData} />
        </div>

        {/* Lead Status Distribution */}
        <div className="card p-5">
          <SectionHeader
            title={locale === "ar" ? "توزيع حالة العملاء" : "Lead Status Distribution"}
            sub={locale === "ar" ? "لقطة للمخزون الحالي من الفرص" : "Snapshot of your current deal inventory"}
            href="/leads"
            linkLabel="View all leads"
          />
          <LeadStatusDonut data={d.statusData} total={d.totalLeads} />
        </div>

        {/* Won vs Lost */}
        <div className="card p-5">
          <SectionHeader
            title={locale === "ar" ? "صفقات مربوحة مقابل خاسرة" : "Won vs. Lost Deals"}
            sub={locale === "ar" ? "آخر 12 شهرًا · تشخيص أداء التحويل" : "Last 12 months · Diagnose conversion performance"}
            href="/pipeline"
            linkLabel="View pipeline"
          />
          <div className="flex gap-4 text-xs mb-3 mt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: WON_COLOR }} />
              Won — {formatSARShort(totalWon)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: LOST_COLOR }} />
              Lost — {formatSARShort(totalLost)}
            </span>
          </div>
          <WonLostChart months={d.months} />
        </div>
      </div>

      {/* ══ ROW 2: Pipeline & Strategy ═══════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Deals by Stage */}
        <div className="card p-5">
          <SectionHeader
            title={locale === "ar" ? "الصفقات حسب المرحلة" : "Deals by Stage"}
            sub={locale === "ar" ? "أين تعتقد فرصك في خط الأنابيب؟" : "Where are your SAR deals getting stuck?"}
            href="/pipeline"
            linkLabel="Open Kanban"
          />
          <p className="text-2xl font-bold text-ink-900 tabular-nums mb-3">
            {formatSAR(d.totalPipeline, locale)}
          </p>
          <DealsByStageChart data={d.dealsByStage} totalPipeline={d.totalPipeline} />
        </div>

        {/* Revenue by Industry */}
        <div className="card p-5">
          <SectionHeader
            title={locale === "ar" ? "الإيرادات حسب القطاع" : "Revenue by Industry"}
            sub={locale === "ar" ? "أكبر تعرضاتك للأعمال في لمحة واحدة" : "Your biggest revenue exposure at a glance"}
            href="/companies"
            linkLabel="View companies"
          />
          <IndustryTreemap data={d.revenueByIndustry} />
        </div>
      </div>

      {/* ══ ROW 3: Action & Priority ══════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        {/* Tasks by Priority */}
        <div className="card p-5">
          <SectionHeader
            title={locale === "ar" ? "المهام حسب الأولوية" : "Tasks by Priority"}
            sub={locale === "ar" ? "هل فريقك يركز على ما يهم؟" : "Are your people focusing on what matters?"}
            href="/tasks"
            linkLabel="View all tasks"
          />
          <TaskPieChart data={d.taskPriorityData} total={d.totalTasks} />
        </div>

        {/* Deal Locations Map */}
        <div className="card p-5">
          <SectionHeader
            title={locale === "ar" ? "مواقع الصفقات" : "Deal Locations"}
            sub={locale === "ar" ? "توزيع فرصك حول المملكة" : "Where across Saudi Arabia are your deals?"}
            href="/companies"
            linkLabel="View companies"
          />
          <SaudiMap locations={d.dealLocations} />
        </div>

        {/* Recent Activity Feed */}
        <div className="card p-5">
          <SectionHeader
            title={locale === "ar" ? "آخر الأنشطة" : "Recent Activity Feed"}
            sub={locale === "ar" ? "معرفة حالة عمليات المبيعات الآن" : "Real-time operational awareness"}
            href="/activities"
            linkLabel="Show all"
          />
          <ActivityFeed activities={d.recentActivities} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   SHARED HEADER COMPONENT
   ════════════════════════════════════════════════ */
function SectionHeader({ title, sub, href, linkLabel }: {
  title: string; sub: string; href: string; linkLabel: string;
}) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div>
        <h2 className="text-[13px] font-semibold text-ink-800 leading-tight">{title}</h2>
        <p className="text-[11px] text-ink-400 mt-0.5 leading-tight">{sub}</p>
      </div>
      <Link href={href} className="text-[11px] text-leaf-600 hover:text-leaf-700 hover:underline whitespace-nowrap ml-3 mt-0.5 shrink-0">
        {linkLabel} →
      </Link>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CHART 1: Leads by Source (clickable bars)
   ════════════════════════════════════════════════ */
function LeadsBySourceChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-ink-400 py-8 text-center">No lead data</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 44, gap = 14, chartH = 150, padT = 22, padB = 34;
  const totalW = data.length * (barW + gap) - gap + 4;
  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + padT + padB}`} className="w-full" style={{ maxHeight: 230 }}>
      {[0, 0.5, 1].map((pct) => {
        const y = padT + chartH * (1 - pct);
        return (
          <g key={pct}>
            <line x1={0} x2={totalW} y1={y} y2={y} stroke="#f0f4f8" strokeWidth="1" />
            <text x={-2} y={y + 3} fontSize="8" fill="#9aabb5" textAnchor="end">{Math.round(max * pct)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const bh = Math.max(4, (d.value / max) * chartH);
        const x  = i * (barW + gap);
        const y  = padT + chartH - bh;
        const color = SOURCE_COLORS[d.label] ?? "#8a98a5";
        const labelStr = d.label.replace(/_/g, " ").split(" ").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
        return (
          <a key={d.label} href="/leads" aria-label={`View ${labelStr} leads`}>
            <rect x={x} y={y} width={barW} height={bh} rx="4" fill={color} opacity={0.9}
              className="cursor-pointer hover:opacity-100" style={{ transition: "opacity 0.15s" }} />
            <text x={x + barW / 2} y={y - 5} fontSize="11" fontWeight="700" fill="#2c3845" textAnchor="middle">{d.value}</text>
            <rect x={x + barW / 2 - 4} y={padT + chartH + 7} width={8} height={5} rx="2" fill={color} />
            <text x={x + barW / 2} y={padT + chartH + 22} fontSize="9" fill="#5b6b78" textAnchor="middle">{labelStr.split(" ")[0]}</text>
            {labelStr.includes(" ") && (
              <text x={x + barW / 2} y={padT + chartH + 32} fontSize="9" fill="#5b6b78" textAnchor="middle">{labelStr.split(" ").slice(1).join(" ")}</text>
            )}
          </a>
        );
      })}
    </svg>
  );
}

/* ════════════════════════════════════════════════
   CHART 2: Lead Status Doughnut (clickable segments)
   ════════════════════════════════════════════════ */
function LeadStatusDonut({ data, total }: { data: { label: string; value: number }[]; total: number }) {
  if (total === 0) return <p className="text-sm text-ink-400 py-8 text-center">No lead data</p>;
  const size = 150, cx = size / 2, cy = size / 2, r = 55, strokeW = 24;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  const segments = data.map((d) => {
    const pct = d.value / total;
    const dash = pct * circ;
    const seg = { ...d, pct, dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} stroke="#eef2f6" strokeWidth={strokeW} fill="none" />
          {segments.map((seg) => (
            <a key={seg.label} href="/leads" aria-label={`View ${seg.label} leads`}>
              <circle
                cx={cx} cy={cy} r={r}
                stroke={STATUS_COLORS[seg.label] ?? "#8a98a5"}
                strokeWidth={strokeW} fill="none"
                strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
                strokeDashoffset={-seg.offset}
                className="cursor-pointer hover:opacity-80"
                style={{ transition: "opacity 0.15s" }}
              />
            </a>
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-ink-900 tabular-nums">{total}</div>
            <div className="text-[9px] uppercase tracking-widest text-ink-400 font-semibold">Leads</div>
          </div>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {segments.map((seg) => (
          <Link key={seg.label} href="/leads" className="flex items-center gap-2 text-xs hover:bg-ink-50 rounded px-1 py-0.5 transition-colors">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[seg.label] ?? "#8a98a5" }} />
            <span className="text-ink-700 truncate">{seg.label.charAt(0) + seg.label.slice(1).toLowerCase()}</span>
            <span className="ml-auto text-ink-500 tabular-nums font-medium">{seg.value}</span>
            <span className="text-ink-400 w-8 text-right tabular-nums">{Math.round(seg.pct * 100)}%</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CHART 3: Won vs Lost Grouped Bars
   ════════════════════════════════════════════════ */
function WonLostChart({ months }: { months: { label: string; won: number; lost: number }[] }) {
  const maxVal = Math.max(...months.map((m) => Math.max(m.won, m.lost)), 1);
  const nMax   = niceCeil(maxVal);
  const chartH = 160, padT = 8, padB = 24, padL = 46;
  const bw = 11, bGap = 3, gw = 38;
  const totalW = padL + months.length * gw;

  return (
    <a href="/pipeline" aria-label="View pipeline">
      <svg viewBox={`0 0 ${totalW} ${chartH + padT + padB}`} className="w-full cursor-pointer" style={{ maxHeight: 220 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padT + chartH * (1 - pct);
          return (
            <g key={pct}>
              <line x1={padL} x2={totalW} y1={y} y2={y} stroke="#f0f4f8" strokeWidth="1" />
              <text x={padL - 5} y={y + 3} fontSize="8" fill="#9aabb5" textAnchor="end">{formatAxisLabel(nMax * pct)}</text>
            </g>
          );
        })}
        {months.map((m, i) => {
          const gx = padL + i * gw + 4;
          const wh = (m.won  / nMax) * chartH;
          const lh = (m.lost / nMax) * chartH;
          return (
            <g key={m.label}>
              <rect x={gx}          y={padT + chartH - wh} width={bw} height={wh} rx="2" fill={WON_COLOR}  opacity={0.85} className="hover:opacity-100" />
              <rect x={gx + bw + bGap} y={padT + chartH - lh} width={bw} height={lh} rx="2" fill={LOST_COLOR} opacity={0.8}  className="hover:opacity-100" />
              <text x={gx + bw} y={padT + chartH + 14} fontSize="8" fill="#9aabb5" textAnchor="middle">{m.label}</text>
            </g>
          );
        })}
      </svg>
    </a>
  );
}

/* ════════════════════════════════════════════════
   CHART 4: Deals by Stage (horizontal funnel bars)
   ════════════════════════════════════════════════ */
function DealsByStageChart({ data, totalPipeline }: {
  data: { name: string; sum: number; count: number; order: number; color: string | null }[];
  totalPipeline: number;
}) {
  const nonEmpty = data.filter((d) => d.sum > 0 || d.count > 0);
  if (nonEmpty.length === 0) return <p className="text-sm text-ink-400 py-4">No active deals</p>;
  const maxSum = Math.max(...data.map((d) => d.sum), 1);

  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const barPct   = (d.sum / maxSum) * 100;
        const sharePct = totalPipeline > 0 ? Math.round((d.sum / totalPipeline) * 100) : 0;
        const color    = d.color ?? STAGE_COLORS[i % STAGE_COLORS.length];
        return (
          <Link href="/pipeline" key={d.name} className="block group">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="font-medium text-ink-700 group-hover:text-ink-900">{d.name}</span>
                {d.count > 0 && <span className="text-ink-400">({d.count})</span>}
              </span>
              <span className="tabular-nums text-ink-600 font-semibold">{formatSARShort(d.sum)}</span>
            </div>
            <div className="h-5 rounded bg-ink-100 overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{ width: `${barPct}%`, background: color, opacity: 0.85 }}
              />
            </div>
            <div className="text-[10px] text-ink-400 text-right mt-0.5 tabular-nums">{sharePct}% of pipeline</div>
          </Link>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════
   CHART 5: Revenue by Industry (Treemap)
   ════════════════════════════════════════════════ */
function IndustryTreemap({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-ink-400 py-8 text-center">No industry data</p>;
  const rects = squarify(data.map((d) => d.value), 380, 200);
  return (
    <svg viewBox="0 0 380 200" className="w-full rounded-lg overflow-hidden" style={{ maxHeight: 220 }}>
      {rects.map((r, i) => {
        const d = data[i];
        if (!d) return null;
        const bw = r.x2 - r.x1, bh = r.y2 - r.y1;
        const color = INDUSTRY_COLORS[i % INDUSTRY_COLORS.length];
        return (
          <a key={d.label} href="/companies" aria-label={`${d.label}: ${formatSARShort(d.value)}`}>
            <g className="cursor-pointer">
              <rect x={r.x1} y={r.y1} width={bw} height={bh} fill={color} rx="3" stroke="#fff" strokeWidth="2"
                className="hover:opacity-80" style={{ transition: "opacity 0.15s" }} />
              {bw > 50 && bh > 28 && (
                <text x={r.x1 + 6} y={r.y1 + 18} fontSize="11" fontWeight="700" fill="#fff"
                  style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}>
                  {d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label}
                </text>
              )}
              {bw > 50 && bh > 44 && (
                <text x={r.x1 + 6} y={r.y1 + 34} fontSize="9" fill="rgba(255,255,255,0.85)">
                  {formatSARShort(d.value)}
                </text>
              )}
            </g>
          </a>
        );
      })}
    </svg>
  );
}

/* ════════════════════════════════════════════════
   CHART 6: Tasks by Priority (Pie + legend)
   ════════════════════════════════════════════════ */
function TaskPieChart({ data, total }: { data: { label: string; value: number }[]; total: number }) {
  if (total === 0) return <p className="text-sm text-ink-400 py-8 text-center">No tasks yet</p>;
  const size = 140, cx = size / 2, cy = size / 2, r = 55;
  let startAngle = -90;

  const slices = data.map((d) => {
    const pct   = d.value / total;
    const sweep = pct * 360;
    const ea    = startAngle + sweep;
    const la    = sweep > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + r * Math.cos((ea * Math.PI) / 180);
    const y2 = cy + r * Math.sin((ea * Math.PI) / 180);
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${la} 1 ${x2} ${y2} Z`;
    startAngle = ea;
    return { ...d, path, pct };
  });

  return (
    <div className="flex items-center gap-4">
      <a href="/tasks" aria-label="View tasks by priority" className="shrink-0">
        <svg width={size} height={size} className="cursor-pointer">
          {slices.map((s) => (
            <a key={s.label} href="/tasks" aria-label={`${s.label} tasks: ${s.value}`}>
              <path d={s.path} fill={PRIORITY_COLORS[s.label] ?? "#8a98a5"}
                className="cursor-pointer hover:opacity-80" style={{ transition: "opacity 0.15s" }} />
            </a>
          ))}
          <circle cx={cx} cy={cy} r={25} fill="white" />
          <text x={cx} y={cy + 4} fontSize="13" fontWeight="700" fill="#2c3845" textAnchor="middle">{total}</text>
        </svg>
      </a>
      <div className="space-y-2 flex-1">
        {slices.map((s) => (
          <Link key={s.label} href="/tasks" className="flex items-center gap-2 text-xs hover:bg-ink-50 rounded px-1 py-0.5 transition-colors">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[s.label] ?? "#8a98a5" }} />
            <span className="text-ink-700 capitalize">{s.label.toLowerCase()}</span>
            <span className="ml-auto tabular-nums font-semibold text-ink-800">{s.value}</span>
            <span className="text-ink-400 w-9 text-right tabular-nums">{Math.round(s.pct * 100)}%</span>
          </Link>
        ))}
        <p className="text-[10px] text-ink-400 pt-1 px-1">Total: {total} tasks</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CHART 7: Saudi Arabia Deal Location Map
   ════════════════════════════════════════════════ */
function SaudiMap({ locations }: { locations: { region: string; value: number; x: number; y: number; label: string }[] }) {
  const maxVal = Math.max(...locations.map((l) => l.value), 1);

  /* Simplified Saudi Arabia polygon (440×385 viewport) */
  const outline = "M 49 88 L 56 60 L 96 46 L 185 44 L 250 50 L 290 66 L 315 90 L 338 98 L 368 118 L 388 148 L 378 192 L 360 228 L 355 262 L 348 288 L 296 338 L 238 360 L 178 368 L 126 302 L 94 268 L 68 208 L 58 158 Z";

  return (
    <a href="/companies" aria-label="View companies by region" className="block">
      <svg viewBox="0 0 440 385" className="w-full cursor-pointer" style={{ maxHeight: 240 }}>
        <path d={outline} fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5" />
        {locations.map((loc) => {
          const bubbleR = 6 + (loc.value / maxVal) * 22;
          return (
            <g key={loc.region}>
              <circle cx={loc.x} cy={loc.y} r={bubbleR} fill="#27ae60" opacity={0.22} />
              <circle cx={loc.x} cy={loc.y} r={Math.max(5, bubbleR * 0.55)} fill="#27ae60" opacity={0.75}
                className="hover:opacity-100" style={{ transition: "opacity 0.15s" }} />
              <text x={loc.x} y={loc.y - bubbleR - 3} fontSize="9" fill="#166534" fontWeight="600" textAnchor="middle">
                {loc.label}
              </text>
              <text x={loc.x} y={loc.y + bubbleR + 11} fontSize="8" fill="#166534" textAnchor="middle">
                {formatSARShort(loc.value)}
              </text>
            </g>
          );
        })}
        {locations.length === 0 && (
          <text x="220" y="185" fontSize="12" fill="#9aabb5" textAnchor="middle">No deal locations yet</text>
        )}
        <g>
          <circle cx="18" cy="372" r="5" fill="#27ae60" opacity="0.7" />
          <text x="28" y="376" fontSize="9" fill="#5b6b78">Deal volume</text>
        </g>
      </svg>
    </a>
  );
}

/* ════════════════════════════════════════════════
   CHART 8: Activity Feed
   ════════════════════════════════════════════════ */
const ACTIVITY_ICONS: Record<string, string> = {
  CALL: "📞", EMAIL: "✉️", WHATSAPP: "💬",
  STAGE_CHANGE: "🔄", NOTE: "📝", MEETING: "🤝",
};

function ActivityFeed({ activities }: {
  activities: {
    id: string; type: string; subject: string; createdAt: Date;
    user: { name: string } | null;
    contact: { firstName: string; lastName: string } | null;
    lead: { id: string } | null;
    opportunity: { id: string } | null;
  }[]
}) {
  if (activities.length === 0) return <p className="text-sm text-ink-400 py-4">No activities yet</p>;
  return (
    <ul className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
      {activities.map((a) => {
        const href = a.opportunity ? `/pipeline` : a.lead ? `/leads` : "/activities";
        const icon = ACTIVITY_ICONS[a.type] ?? "⚡";
        const relTime = relativeTime(a.createdAt);
        return (
          <li key={a.id}>
            <Link href={href} className="flex items-start gap-2 text-xs hover:bg-ink-50 rounded-md px-2 py-1.5 transition-colors group">
              <span className="text-sm leading-none mt-0.5 shrink-0">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-ink-700 group-hover:text-ink-900 leading-snug line-clamp-2">{a.subject}</p>
                <p className="text-ink-400 mt-0.5">
                  {a.user?.name ?? "System"}
                  {a.contact && <> · {a.contact.firstName} {a.contact.lastName}</>}
                  <span className="ml-1 text-ink-300">· {relTime}</span>
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════ */
function formatSARShort(v: number): string {
  if (v >= 1_000_000) return `SAR ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `SAR ${Math.round(v / 1_000)}K`;
  return `SAR ${Math.round(v)}`;
}

function formatAxisLabel(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

function niceCeil(n: number) {
  if (n <= 0) return 1;
  if (n <= 5) return 5;
  if (n <= 10) return 10;
  if (n <= 25) return 25;
  if (n <= 50) return 50;
  if (n <= 100) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / pow) * pow;
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Recursive halving treemap layout */
function squarify(values: number[], w: number, h: number): { x1: number; y1: number; x2: number; y2: number }[] {
  if (values.length === 0) return [];
  const total = values.reduce((s, v) => s + v, 0) || 1;
  const norm  = values.map((v) => v / total);
  const rects: { x1: number; y1: number; x2: number; y2: number }[] = [];

  function layout(items: number[], x: number, y: number, lw: number, lh: number) {
    if (items.length === 0) return;
    if (items.length === 1) { rects.push({ x1: x, y1: y, x2: x + lw, y2: y + lh }); return; }
    const half = Math.ceil(items.length / 2);
    const sumA = items.slice(0, half).reduce((s, v) => s + v, 0);
    const sumB = items.slice(half).reduce((s, v) => s + v, 0);
    const ratioA = sumA / (sumA + sumB);
    if (lw >= lh) {
      layout(items.slice(0, half), x,               y, lw * ratioA,       lh);
      layout(items.slice(half),    x + lw * ratioA, y, lw * (1 - ratioA), lh);
    } else {
      layout(items.slice(0, half), x, y,               lw, lh * ratioA);
      layout(items.slice(half),    x, y + lh * ratioA, lw, lh * (1 - ratioA));
    }
  }
  layout(norm, 0, 0, w, h);
  return rects;
}
