"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export default function OpportunityNoteForm({
  locale,
  opportunityId,
}: {
  locale: Locale;
  opportunityId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        const fd = new FormData(e.currentTarget);
        const res = await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: fd.get("type"),
            subject: fd.get("subject"),
            body: fd.get("body") || null,
            opportunityId,
          }),
        });
        setBusy(false);
        if (!res.ok) {
          setErr(locale === "ar" ? "تعذر حفظ النشاط" : "Failed to save activity");
          return;
        }
        (e.currentTarget as HTMLFormElement).reset();
        router.refresh();
      }}
    >
      <div>
        <label className="label">{locale === "ar" ? "النوع" : "Type"}</label>
        <select name="type" className="input" defaultValue="NOTE">
          {[
            ["NOTE", locale === "ar" ? "ملاحظة" : "Note"],
            ["CALL", locale === "ar" ? "اتصال" : "Call"],
            ["EMAIL", locale === "ar" ? "بريد" : "Email"],
            ["WHATSAPP", "WhatsApp"],
            ["MEETING", locale === "ar" ? "اجتماع" : "Meeting"],
            ["STATUS_CHANGE", locale === "ar" ? "تغيير مرحلة" : "Stage change"],
          ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{locale === "ar" ? "العنوان" : "Subject"}</label>
        <input name="subject" required className="input" placeholder={locale === "ar" ? "مثال: أرسلت المواصفات الفنية" : "e.g. Sent technical specs"} />
      </div>
      <div>
        <label className="label">{locale === "ar" ? "التفاصيل" : "Details"}</label>
        <textarea name="body" className="input min-h-[88px]" placeholder={locale === "ar" ? "ملاحظات داخلية، ما حدث في المكالمة، رد العميل…" : "Internal notes, what happened on the call, buyer feedback…"} />
      </div>
      {err && <div className="text-xs text-accent-red">{err}</div>}
      <button disabled={busy} className="btn-primary w-full">{busy ? "…" : (locale === "ar" ? "إضافة نشاط" : "Add activity")}</button>
    </form>
  );
}