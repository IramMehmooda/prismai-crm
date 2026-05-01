"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { formatSAR, type Locale } from "@/lib/i18n";

type Product = { id: string; sku: string; name: string; nameAr: string | null; unitPriceSar: number; taxRate: number };
type Contact = { id: string; name: string };
type Company = { id: string; name: string; vatNumber: string | null; nameAr: string | null; contacts: Contact[] };
type Opp = { id: string; title: string; companyId: string | null; amount: number };

type LineItem = { description: string; quantity: number; unitPriceSar: number; discountPct: number; taxRate: number; productId?: string | null };

export default function QuoteBuilder({
  locale,
  products,
  companies,
  opportunities,
  defaultOpportunityId = "",
  initialValues,
  onSubmit,
  onCancel,
  editMode = false,
}: {
  locale: Locale;
  products: Product[];
  companies: Company[];
  opportunities: Opp[];
  defaultOpportunityId?: string;
  initialValues?: any;
  onSubmit?: (patch: any) => void;
  onCancel?: () => void;
  editMode?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<LineItem[]>(initialValues?.items ?? [{ description: "", quantity: 1, unitPriceSar: 0, discountPct: 0, taxRate: 0.15 }]);
  const initialOpportunity = opportunities.find((item) => item.id === (initialValues?.opportunityId ?? defaultOpportunityId)) ?? null;
  const [opportunityId, setOpportunityId] = useState<string>(initialValues?.opportunityId ?? defaultOpportunityId);
  const [companyId, setCompanyId] = useState<string>(initialValues?.companyId ?? initialOpportunity?.companyId ?? "");
  const [contactId, setContactId] = useState<string>(initialValues?.contactId ?? "");
  const [validUntil, setValidUntil] = useState<string>(initialValues?.validUntil ? initialValues.validUntil.slice(0, 10) : "");
  const [notes, setNotes] = useState<string>(initialValues?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const company = companies.find((c) => c.id === companyId);

  const totals = useMemo(() => {
    let sub = 0, disc = 0, vat = 0;
    for (const it of items) {
      const gross = it.quantity * it.unitPriceSar;
      const d = gross * (it.discountPct / 100);
      const tax = (gross - d) * it.taxRate;
      sub += gross; disc += d; vat += tax;
    }
    return { sub, disc, vat, total: sub - disc + vat };
  }, [items]);

  function setItem(i: number, patch: Partial<LineItem>) {
    setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() { setItems((c) => [...c, { description: "", quantity: 1, unitPriceSar: 0, discountPct: 0, taxRate: 0.15 }]); }
  function removeItem(i: number) { setItems((c) => c.filter((_, idx) => idx !== i)); }
  function applyProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setItem(i, { productId, description: locale === "ar" && p.nameAr ? p.nameAr : p.name, unitPriceSar: p.unitPriceSar, taxRate: p.taxRate });
  }

  async function submit() {
    setBusy(true); setErr(null);
    const validItems = items.filter((it) => it.description && it.quantity > 0);
    if (validItems.length === 0) { setBusy(false); setErr("Add at least one item"); return; }
    const payload = {
      opportunityId: opportunityId || null,
      companyId: companyId || null,
      contactId: contactId || null,
      buyerVat: company?.vatNumber ?? null,
      buyerNameAr: company?.nameAr ?? null,
      validUntil: validUntil || null,
      notes: notes || null,
      items: validItems,
    };
    if (editMode && onSubmit) {
      setBusy(false);
      onSubmit(payload);
      return;
    }
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) { setErr("Failed to save quote"); return; }
    router.push(`/quotes/${j.id}`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="card card-body grid grid-cols-2 gap-3">
          <div>
            <label className="label">{locale === "ar" ? "الفرصة" : "Opportunity"}</label>
            <select className="input" value={opportunityId} onChange={(e) => {
              const id = e.target.value; setOpportunityId(id);
              const o = opportunities.find((x) => x.id === id);
              if (o?.companyId) setCompanyId(o.companyId);
            }}>
              <option value="">—</option>
              {opportunities.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{locale === "ar" ? "صالح حتى" : "Valid until"}</label>
            <input type="date" className="input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}/>
          </div>
          <div>
            <label className="label">{locale === "ar" ? "الشركة" : "Company"}</label>
            <select className="input" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setContactId(""); }}>
              <option value="">—</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{locale === "ar" ? "جهة الاتصال" : "Contact"}</label>
            <select className="input" value={contactId} onChange={(e) => setContactId(e.target.value)} disabled={!company}>
              <option value="">—</option>
              {company?.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">{locale === "ar" ? "ملاحظات" : "Notes"}</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}/>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="card-header"><span>{locale === "ar" ? "البنود" : "Line items"}</span>
            <button onClick={addItem} className="btn-outline !py-1 !px-3 !text-xs"><Icon name="plus" size={12}/> {locale === "ar" ? "بند" : "Item"}</button>
          </div>
          <table className="table-modern">
            <thead>
              <tr>
                <th>{locale === "ar" ? "البند" : "Description"}</th>
                <th className="w-20 text-end">{locale === "ar" ? "كمية" : "Qty"}</th>
                <th className="w-32 text-end">{locale === "ar" ? "سعر" : "Unit"}</th>
                <th className="w-20 text-end">{locale === "ar" ? "خصم %" : "Disc %"}</th>
                <th className="w-32 text-end">{locale === "ar" ? "إجمالي" : "Total"}</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const line = it.quantity * it.unitPriceSar * (1 - it.discountPct / 100);
                return (
                  <tr key={i}>
                    <td>
                      <select className="input !py-1 !text-xs mb-1" defaultValue="" onChange={(e) => applyProduct(i, e.target.value)}>
                        <option value="">{locale === "ar" ? "— اختر منتج —" : "— pick product —"}</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
                      </select>
                      <input className="input !py-1.5" placeholder={locale === "ar" ? "الوصف" : "Description"} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })}/>
                    </td>
                    <td><input type="number" min="0" step="0.01" className="input text-end !py-1.5" value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })}/></td>
                    <td><input type="number" min="0" step="0.01" className="input text-end !py-1.5" value={it.unitPriceSar} onChange={(e) => setItem(i, { unitPriceSar: Number(e.target.value) })}/></td>
                    <td><input type="number" min="0" max="100" step="0.5" className="input text-end !py-1.5" value={it.discountPct} onChange={(e) => setItem(i, { discountPct: Number(e.target.value) })}/></td>
                    <td className="text-end font-semibold tabular-nums">{formatSAR(line, locale)}</td>
                    <td><button onClick={() => removeItem(i)} className="text-ink-400 hover:text-accent-red"><Icon name="trash" size={14}/></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="card sticky top-24">
          <div className="card-header"><span>{locale === "ar" ? "الإجمالي" : "Summary"}</span></div>
          <div className="card-body space-y-2 text-[13px]">
            <Row label={locale === "ar" ? "الإجمالي الفرعي" : "Subtotal"} value={formatSAR(totals.sub, locale)} />
            <Row label={locale === "ar" ? "الخصم" : "Discount"} value={`- ${formatSAR(totals.disc, locale)}`} tone="text-accent-red"/>
            <Row label={locale === "ar" ? "ضريبة 15%" : "VAT 15%"} value={formatSAR(totals.vat, locale)} />
            <div className="border-t border-ink-200 my-2"/>
            <Row label={locale === "ar" ? "الإجمالي" : "Total"} value={formatSAR(totals.total, locale)} bold/>
            {totals.total > 1_000_000 && <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1.5 rounded mt-2">⚠ {locale === "ar" ? "يتطلب اعتماد المالية" : "Requires FINANCE approval"}</div>}
            {totals.total > 500_000 && totals.total <= 1_000_000 && <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1.5 rounded mt-2">⚠ {locale === "ar" ? "يتطلب اعتماد المدير" : "Requires MANAGER approval"}</div>}
            {err && <div className="text-xs text-accent-red">{err}</div>}
            <button disabled={busy} onClick={submit} className="btn-primary w-full mt-2">{busy ? "…" : (editMode ? (locale === "ar" ? "حفظ التعديلات" : "Save changes") : (locale === "ar" ? "حفظ كمسودة" : "Save draft"))}</button>
            {editMode && onCancel && <button type="button" className="btn-outline w-full mt-2" onClick={onCancel}>{locale === "ar" ? "إلغاء" : "Cancel"}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-semibold text-ink-900" : "text-ink-500"}>{label}</span>
      <span className={`tabular-nums ${bold ? "text-lg font-bold text-leaf-600" : tone ?? "text-ink-700 font-medium"}`}>{value}</span>
    </div>
  );
}
