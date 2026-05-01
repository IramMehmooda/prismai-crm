"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export default function CampaignForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        const fd = new FormData(e.currentTarget);
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fd.get("name"),
            goal: fd.get("description") || null,
            channel: fd.get("channel"),
            status: fd.get("status"),
            budgetSar: fd.get("budget") ? Number(fd.get("budget")) : null,
            startDate: fd.get("startDate") || null,
            endDate: fd.get("endDate") || null,
          }),
        });
        setBusy(false);
        if (!res.ok) { setErr("Failed"); return; }
        router.push("/campaigns");
        router.refresh();
      }}
    >
      <div><label className="label">{locale === "ar" ? "الاسم" : "Name"}</label><input name="name" required className="input"/></div>
      <div><label className="label">{locale === "ar" ? "الوصف" : "Description"}</label><textarea name="description" rows={2} className="input"/></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{locale === "ar" ? "القناة" : "Channel"}</label>
          <select name="channel" className="input" defaultValue="EMAIL">
            <option value="EMAIL">EMAIL</option>
            <option value="WHATSAPP">WHATSAPP</option>
            <option value="EVENT">EVENT</option>
            <option value="OTHER">OTHER</option>
            <option value="LINKEDIN">LINKEDIN</option>
          </select>
        </div>
        <div>
          <label className="label">{locale === "ar" ? "الحالة" : "Status"}</label>
          <select name="status" className="input" defaultValue="DRAFT">
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="DONE">DONE</option>
          </select>
        </div>
      </div>
      <div><label className="label">{locale === "ar" ? "الميزانية (ر.س)" : "Budget (SAR)"}</label><input name="budget" type="number" step="0.01" className="input"/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">{locale === "ar" ? "تاريخ البدء" : "Start"}</label><input name="startDate" type="date" className="input"/></div>
        <div><label className="label">{locale === "ar" ? "تاريخ الانتهاء" : "End"}</label><input name="endDate" type="date" className="input"/></div>
      </div>
      {err && <div className="text-xs text-accent-red">{err}</div>}
      <button disabled={busy} className="btn-primary">{busy ? "…" : (locale === "ar" ? "حفظ" : "Save")}</button>
    </form>
  );
}
