"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export default function NewTaskForm({
  locale, users, leads, opps, defaultAssigneeId, defaultOpportunityId = "",
}: { locale: Locale; users: { id: string; name: string }[]; leads: { id: string; title: string }[]; opps: { id: string; title: string }[]; defaultAssigneeId: string; defaultOpportunityId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true); setErr(null);
        const fd = new FormData(form);
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: fd.get("title"),
            description: fd.get("description") || null,
            dueAt: fd.get("dueAt") || null,
            priority: fd.get("priority"),
            assigneeId: fd.get("assigneeId"),
            leadId: fd.get("leadId") || null,
            opportunityId: fd.get("opportunityId") || null,
          }),
        });
        setBusy(false);
        if (!res.ok) { setErr("Failed to create task"); return; }
        form.reset();
        router.refresh();
      }}
    >
      <div>
        <label className="label">{locale === "ar" ? "العنوان" : "Title"}</label>
        <input name="title" required className="input" placeholder={locale === "ar" ? "أرسل ورقة البيانات للمضخة…" : "Send pump datasheet…"}/>
      </div>
      <div>
        <label className="label">{locale === "ar" ? "وصف" : "Description"}</label>
        <textarea name="description" rows={2} className="input"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{locale === "ar" ? "الاستحقاق" : "Due date"}</label>
          <input name="dueAt" type="date" className="input"/>
        </div>
        <div>
          <label className="label">{locale === "ar" ? "الأولوية" : "Priority"}</label>
          <select name="priority" className="input" defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">{locale === "ar" ? "المسند إليه" : "Assignee"}</label>
        <select name="assigneeId" required className="input" defaultValue={defaultAssigneeId}>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{locale === "ar" ? "عميل محتمل (اختياري)" : "Lead (optional)"}</label>
        <select name="leadId" className="input" defaultValue="">
          <option value="">—</option>
          {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.title}</option>)}
        </select>
        <p className="text-[11px] text-ink-400 mt-1">{locale === "ar" ? "اربط المهمة بعميل محتمل عندما تكون المتابعة قبل تحويله إلى فرصة." : "Link the task to a lead when the follow-up happens before it becomes an opportunity."}</p>
      </div>
      <div>
        <label className="label">{locale === "ar" ? "فرصة (اختياري)" : "Opportunity (optional)"}</label>
        <select name="opportunityId" className="input" defaultValue={defaultOpportunityId}>
          <option value="">—</option>
          {opps.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
        <p className="text-[11px] text-ink-400 mt-1">{locale === "ar" ? "اربط المهمة بصفقة حتى تظهر في سياق الفرصة أيضًا." : "Link the task to a deal so it also appears in the opportunity context."}</p>
      </div>
      {err && <div className="text-xs text-accent-red">{err}</div>}
      <button disabled={busy} className="btn-primary w-full">{busy ? "…" : (locale === "ar" ? "إنشاء" : "Create task")}</button>
    </form>
  );
}
