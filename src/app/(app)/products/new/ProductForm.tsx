"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export default function ProductForm({ locale }: { locale: Locale }) {
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
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: fd.get("sku"),
            name: fd.get("name"),
            nameAr: fd.get("nameAr") || null,
            description: fd.get("description") || null,
            unitPriceSar: Number(fd.get("unitPriceSar")),
            taxRate: Number(fd.get("taxRate") || 0.15),
            category: fd.get("category") || null,
          }),
        });
        setBusy(false);
        if (!res.ok) { setErr("Failed"); return; }
        router.push("/products");
        router.refresh();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">SKU</label><input name="sku" required className="input"/></div>
        <div><label className="label">{locale === "ar" ? "الفئة" : "Category"}</label><input name="category" className="input"/></div>
      </div>
      <div><label className="label">{locale === "ar" ? "الاسم (EN)" : "Name (EN)"}</label><input name="name" required className="input"/></div>
      <div><label className="label">{locale === "ar" ? "الاسم (AR)" : "Name (AR)"}</label><input name="nameAr" className="input" dir="rtl"/></div>
      <div><label className="label">{locale === "ar" ? "الوصف" : "Description"}</label><textarea name="description" rows={2} className="input"/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">{locale === "ar" ? "سعر الوحدة (ر.س)" : "Unit price (SAR)"}</label><input name="unitPriceSar" type="number" step="0.01" required className="input"/></div>
        <div><label className="label">{locale === "ar" ? "ضريبة" : "Tax rate"}</label><input name="taxRate" type="number" step="0.01" defaultValue={0.15} className="input"/></div>
      </div>
      {err && <div className="text-xs text-accent-red">{err}</div>}
      <button disabled={busy} className="btn-primary">{busy ? "…" : (locale === "ar" ? "حفظ" : "Save")}</button>
    </form>
  );
}
