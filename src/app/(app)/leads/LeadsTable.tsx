"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { formatSAR, t, type Locale } from "@/lib/i18n";
import ConvertButton from "./ConvertButton";

type StageOption = {
  id: string;
  name: string;
  probability: number;
};

type LeadRow = {
  id: string;
  title: string;
  source: string;
  status: string;
  score: number;
  estimatedValue: number | null;
  ownerId: string | null;
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  owner: { name: string } | null;
  activities: { createdAt: string }[];
};

type TabKey = "active" | "mine" | "new" | "converted";

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

function priorityMeta(score: number, locale: Locale) {
  if (score >= 75) {
    return {
      tone: "bg-rose-100 text-rose-700 border border-rose-200",
      icon: "lightning" as const,
      label: locale === "ar" ? "حار" : "Hot",
    };
  }
  if (score >= 40) {
    return {
      tone: "bg-amber-100 text-amber-700 border border-amber-200",
      icon: "trend-up" as const,
      label: locale === "ar" ? "متوسط" : "Medium",
    };
  }
  return {
    tone: "bg-slate-100 text-slate-700 border border-slate-200",
    icon: "clock" as const,
    label: locale === "ar" ? "منخفض" : "Low",
  };
}

function daysAgoLabel(dateText: string | null, locale: Locale) {
  if (!dateText) return locale === "ar" ? "لا نشاط" : "No activity";
  const createdAt = new Date(dateText);
  const now = new Date();
  const diff = Math.max(0, now.getTime() - createdAt.getTime());
  const days = Math.floor(diff / 86400000);
  if (days === 0) return locale === "ar" ? "اليوم" : "Today";
  if (days === 1) return locale === "ar" ? "منذ يوم" : "1 day ago";
  return locale === "ar" ? `منذ ${days} أيام` : `${days} days ago`;
}

function activityTone(dateText: string | null) {
  if (!dateText) return "text-rose-600";
  const createdAt = new Date(dateText);
  const now = new Date();
  const days = Math.floor((now.getTime() - createdAt.getTime()) / 86400000);
  if (days >= 5) return "text-rose-600";
  if (days >= 3) return "text-amber-600";
  return "text-emerald-700";
}

function scoreBar(score: number) {
  const tone = score >= 70 ? "bg-grad-mint" : score >= 40 ? "bg-grad-brand" : "bg-grad-sunset";
  return (
    <div className="flex items-center gap-2 w-28">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-7 text-end tabular-nums">{score}</span>
    </div>
  );
}

function StatusSelect({
  id,
  value,
  locale,
}: {
  id: string;
  value: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(value);

  async function updateStatus(nextStatus: string) {
    setStatus(nextStatus);
    setBusy(true);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setBusy(false);
    if (!res.ok) {
      setStatus(value);
      alert(locale === "ar" ? "تعذر تحديث حالة العميل المحتمل" : "Failed to update lead status");
      return;
    }
    router.refresh();
  }

  return (
    <select
      className={`rounded-md border px-2.5 py-1.5 text-[12px] font-semibold bg-white ${statusTone(status)}`}
      value={status}
      disabled={busy}
      onChange={(e) => updateStatus(e.target.value)}
    >
      {["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"].map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function LeadsTable({
  leads,
  stages,
  locale,
  currentUserId,
  filterSource,
  filterStatus,
}: {
  leads: LeadRow[];
  stages: StageOption[];
  locale: Locale;
  currentUserId: string;
  filterSource?: string;
  filterStatus?: string;
}) {
  const isFiltered = !!(filterSource || filterStatus);
  // When arriving from a chart filter, pre-select the most relevant tab
  const defaultTab: TabKey =
    filterStatus === "CONVERTED" ? "converted" :
    filterStatus === "NEW" ? "new" :
    "active";
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>(defaultTab);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (tab === "active" && lead.status === "CONVERTED") return false;
      if (tab === "mine" && lead.ownerId !== currentUserId) return false;
      if (tab === "new" && lead.status !== "NEW") return false;
      if (tab === "converted" && lead.status !== "CONVERTED") return false;
      if (!needle) return true;
      const haystack = [
        lead.title,
        lead.source,
        lead.company?.name ?? "",
        lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName}` : "",
        lead.owner?.name ?? "",
      ].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [currentUserId, leads, search, tab]);

  const visibleIds = filtered.map((lead) => lead.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  function toggleAll() {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const activeLeads = leads.filter((lead) => lead.status !== "CONVERTED");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "active", label: locale === "ar" ? "العملاء النشطون" : "Active Leads", count: activeLeads.length },
    { key: "mine", label: locale === "ar" ? "عملائي" : "My Leads", count: activeLeads.filter((lead) => lead.ownerId === currentUserId).length },
    { key: "new", label: locale === "ar" ? "الجديدة" : "New Leads", count: activeLeads.filter((lead) => lead.status === "NEW").length },
    { key: "converted", label: locale === "ar" ? "المحوّلة" : "Converted", count: leads.filter((lead) => lead.status === "CONVERTED").length },
  ];

  return (
    <div className="space-y-4">
      {/* Filter banner — shown when navigating from an analytics chart */}
      {isFiltered && (
        <div className="flex items-center gap-3 rounded-lg border border-leaf-200 bg-leaf-50 px-4 py-2.5 text-sm">
          <span className="text-leaf-700 font-medium">
            {locale === "ar" ? "تصفية:" : "Filtered by:"}
          </span>
          {filterSource && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-leaf-200 px-2.5 py-0.5 text-[12px] font-semibold text-leaf-800">
              Source = {filterSource.replace(/_/g, " ")}
            </span>
          )}
          {filterStatus && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-leaf-200 px-2.5 py-0.5 text-[12px] font-semibold text-leaf-800">
              Status = {filterStatus}
            </span>
          )}
          <a href="/leads" className="ml-auto text-[12px] text-leaf-600 hover:text-leaf-800 hover:underline">
            {locale === "ar" ? "× مسح الفلاتر" : "× Clear filter"}
          </a>
        </div>
      )}
      <div className="card p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold border transition ${tab === item.key ? "bg-nav-700 text-white border-nav-700" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"}`}
              onClick={() => setTab(item.key)}
            >
              {item.label} <span className="ml-1 opacity-75">{item.count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === "ar" ? "ابحث في العملاء المحتملين" : "Search leads, company, contact..."}
          />
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="card px-4 py-3 flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-ink-700">
            {selectedIds.length} {locale === "ar" ? "محدد" : "selected"}
          </span>
          <div className="flex items-center gap-2">
            <button className="btn-outline text-xs px-3 py-1.5" disabled>
              {locale === "ar" ? "إرسال بريد" : "Send email"}
            </button>
            <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => setSelectedIds([])}>
              {locale === "ar" ? "إلغاء التحديد" : "Clear selection"}
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="table-modern">
          <thead>
            <tr>
              <th className="w-10">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
              </th>
              <th>{t(locale, "title")}</th>
              <th>{t(locale, "company")}</th>
              <th>{t(locale, "contact")}</th>
              <th>{t(locale, "source")}</th>
              <th>{t(locale, "status")}</th>
              <th>{locale === "ar" ? "آخر نشاط" : "Last activity"}</th>
              <th>{locale === "ar" ? "الأولوية" : "Priority"}</th>
              <th>{locale === "ar" ? "المسند إلى" : "Assigned to"}</th>
              <th className="text-end">{locale === "ar" ? "القيمة المحتملة" : "Potential value"}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => {
              const lastActivity = lead.activities[0]?.createdAt ?? null;
              const priority = priorityMeta(lead.score, locale);
              const selected = selectedIds.includes(lead.id);
              return (
                <tr key={lead.id} className={selected ? "bg-leaf-50" : undefined}>
                  <td>
                    <input type="checkbox" checked={selected} onChange={() => toggleOne(lead.id)} />
                  </td>
                  <td>
                    <Link href={`/leads/${lead.id}`} className="font-semibold text-brand-700 hover:underline">
                      {lead.title}
                    </Link>
                  </td>
                  <td>
                    {lead.company ? (
                      <Link href={`/companies/${lead.company.id}`} className="text-brand-700 hover:underline">
                        {lead.company.name}
                      </Link>
                    ) : "—"}
                  </td>
                  <td>
                    {lead.contact ? (
                      <Link href={`/contacts/${lead.contact.id}`} className="text-brand-700 hover:underline">
                        {lead.contact.firstName} {lead.contact.lastName}
                      </Link>
                    ) : "—"}
                  </td>
                  <td><span className="pill bg-slate-100 text-slate-700">{lead.source}</span></td>
                  <td><StatusSelect id={lead.id} value={lead.status} locale={locale} /></td>
                  <td>
                    <div className={`text-sm font-medium ${activityTone(lastActivity)}`}>
                      {daysAgoLabel(lastActivity, locale)}
                    </div>
                  </td>
                  <td>
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${priority.tone}`}>
                      <Icon name={priority.icon} size={12} />
                      {priority.label}
                    </div>
                    <div className="mt-1">{scoreBar(lead.score)}</div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="avatar w-7 h-7 bg-grad-brand">{(lead.owner?.name ?? "?").split(" ").map((item) => item[0]).slice(0, 2).join("")}</span>
                      <span className="text-sm">{lead.owner?.name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="text-end font-semibold tabular-nums">{formatSAR(lead.estimatedValue, locale)}</td>
                  <td>
                    <ConvertButton
                      leadId={lead.id}
                      title={lead.title}
                      company={lead.company?.name ?? null}
                      estimatedValue={lead.estimatedValue}
                      status={lead.status}
                      locale={locale}
                      stages={stages}
                    />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-5 py-12 text-center text-slate-500">
                  {locale === "ar" ? "لا توجد نتائج مطابقة." : "No leads match this view."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}