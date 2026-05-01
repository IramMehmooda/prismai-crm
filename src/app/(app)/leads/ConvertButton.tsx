"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
const UserSelect = dynamic(() => import("@/components/UserSelect"), { ssr: false });
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

type StageOption = {
  id: string;
  name: string;
  probability: number;
};

export default function ConvertButton({
  leadId,
  title,
  company,
  estimatedValue,
  status,
  locale,
  stages,
}: {
  leadId: string;
  title: string;
  company: string | null;
  estimatedValue: number | null;
  status: string;
  locale: "en" | "ar";
  stages: StageOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const defaultStage = stages.find((stage) => /qualified/i.test(stage.name)) ?? stages[0] ?? null;
  const [form, setForm] = useState({
    amount: estimatedValue ? String(Math.round(estimatedValue)) : "",
    stageId: defaultStage?.id ?? "",
    expectedCloseAt: "",
    ownerId: "",
    startDate: "",
  });
  if (status === "CONVERTED" || status === "DISQUALIFIED") return null;

  async function convert() {
    setBusy(true);
    const res = await fetch(`/api/leads/${leadId}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId: form.stageId || undefined,
        amount: form.amount ? Number(form.amount) : undefined,
        expectedCloseAt: form.expectedCloseAt || null,
        ownerId: form.ownerId || undefined,
        startDate: form.startDate || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      alert(locale === "ar" ? "تعذر تحويل العميل المحتمل" : "Failed to convert lead");
      return;
    }
    setOpen(false);
    router.push("/pipeline");
    router.refresh();
  }

  return (
    <>
      <button
        disabled={busy}
        title={locale === "ar" ? "تحويل إلى فرصة" : "Convert to opportunity"}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-leaf-200 bg-leaf-50 px-3 py-1.5 text-[12px] font-semibold text-leaf-700 hover:bg-leaf-100 disabled:opacity-50"
      >
        <Icon name="trend-up" size={14}/>
        {locale === "ar" ? "تحويل" : "Convert"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {locale === "ar" ? "تحويل العميل المحتمل إلى فرصة" : "Convert Lead to Opportunity"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {title}{company ? ` · ${company}` : ""}
                </p>
              </div>
              <button className="btn-ghost px-2 py-1" onClick={() => !busy && setOpen(false)}>
                <Icon name="x" size={14} />
              </button>
            </div>

            <p className="mt-4 text-sm text-ink-600">
              {locale === "ar"
                ? "سيتم أرشفة هذا العميل المحتمل وإنشاء صفقة جديدة في لوحة المبيعات."
                : "This will archive the lead and create a new deal in the pipeline."}
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{locale === "ar" ? "قيمة الصفقة" : "Deal value"}</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
                  placeholder={locale === "ar" ? "مثال: 1260000" : "e.g. 1260000"}
                />
              </div>
              <div>
                <label className="label">{locale === "ar" ? "مرحلة الصفقة" : "Pipeline stage"}</label>
                <select
                  className="input"
                  value={form.stageId}
                  onChange={(e) => setForm((current) => ({ ...current, stageId: e.target.value }))}
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name} ({stage.probability}%)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{locale === "ar" ? "تاريخ البدء" : "Start date"}</label>
                <input
                  className="input"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((current) => ({ ...current, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">{locale === "ar" ? "المسند إلى" : "Assignee"}</label>
                <UserSelect value={form.ownerId} onChange={id => setForm(current => ({ ...current, ownerId: id }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{locale === "ar" ? "تاريخ الإغلاق المتوقع" : "Expected close date"}</label>
                <input
                  className="input"
                  type="date"
                  value={form.expectedCloseAt}
                  onChange={(e) => setForm((current) => ({ ...current, expectedCloseAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button className="btn-ghost" disabled={busy} onClick={() => setOpen(false)}>
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button className="btn-primary" disabled={busy || stages.length === 0} onClick={convert}>
                {busy ? "..." : locale === "ar" ? "تحويل وفتح الصفقة" : "Convert & open deal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
