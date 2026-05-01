"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/lib/i18n";
import dynamic from "next/dynamic";

const DynamicQuoteBuilder = dynamic(() => import("../new/QuoteBuilder"), { ssr: false });
export default function QuoteActions({ id, status, role, locale }: { id: string; status: string; role: string; locale: Locale }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [quoteData, setQuoteData] = useState<any>(null);

  async function call(action: string, reason?: string) {
    setBusy(true);
    const res = await fetch(`/api/quotes/${id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  async function handleEdit() {
    setBusy(true);
    const res = await fetch(`/api/quotes/${id}`);
    if (!res.ok) {
      setBusy(false);
      alert("Failed to load quote");
      return;
    }
    const data = await res.json();
    setQuoteData(data);
    setEditOpen(true);
    setBusy(false);
  }

  async function handleDelete() {
    if (!confirm(locale === "ar" ? "هل أنت متأكد من حذف العرض؟" : "Are you sure you want to delete this quote?")) return;
    setBusy(true);
    const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      alert("Failed to delete quote");
      return;
    }
    router.push("/quotes");
  }

  async function handleSaveEdit(patch: any) {
    setBusy(true);
    const res = await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    if (!res.ok) {
      alert("Failed to update quote");
      return;
    }
    setEditOpen(false);
    router.refresh();
  }

  const canApprove = role === "ADMIN" || role === "SALES_MANAGER" || role === "FINANCE";

  return (
    <>
      <div className="flex gap-2">
        {status === "DRAFT" && (
          <button disabled={busy} onClick={() => call("SUBMIT")} className="btn-primary"><Icon name="send" size={14}/> {locale === "ar" ? "إرسال للاعتماد" : "Submit"}</button>
        )}
        {status === "PENDING_APPROVAL" && canApprove && (
          <>
            <button disabled={busy} onClick={() => call("APPROVE")} className="btn-primary"><Icon name="check" size={14}/> {locale === "ar" ? "اعتماد" : "Approve"}</button>
            <button disabled={busy} onClick={() => { const r = prompt(locale === "ar" ? "السبب" : "Reason"); if (r != null) call("REJECT", r); }} className="btn-outline"><Icon name="x" size={14}/> {locale === "ar" ? "رفض" : "Reject"}</button>
          </>
        )}
        {status === "APPROVED" && (
          <button disabled={busy} onClick={() => call("SEND")} className="btn-primary"><Icon name="send" size={14}/> {locale === "ar" ? "إرسال للعميل" : "Send"}</button>
        )}
        {status === "SENT" && (
          <>
            <button disabled={busy} onClick={() => call("ACCEPT")} className="btn-primary"><Icon name="check" size={14}/> {locale === "ar" ? "مقبول" : "Mark accepted"}</button>
            <button disabled={busy} onClick={() => call("DECLINE")} className="btn-outline"><Icon name="x" size={14}/> {locale === "ar" ? "مرفوض" : "Mark declined"}</button>
          </>
        )}
        {/* Edit/Delete always available for DRAFT, and for ADMIN/SALES_MANAGER */}
        {(status === "DRAFT" || canApprove) && (
          <>
            <button disabled={busy} onClick={handleEdit} className="btn-outline"><Icon name="edit" size={14}/> {locale === "ar" ? "تعديل" : "Edit"}</button>
            <button disabled={busy} onClick={handleDelete} className="btn-outline text-accent-red"><Icon name="trash" size={14}/> {locale === "ar" ? "حذف" : "Delete"}</button>
          </>
        )}
      </div>
      {editOpen && quoteData && (
        <div className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-2xl relative">
            <button className="absolute top-2 right-2 text-ink-400 hover:text-ink-700" onClick={() => setEditOpen(false)}><Icon name="x" size={18}/></button>
            <h2 className="text-xl font-bold mb-4">{locale === "ar" ? "تعديل العرض" : "Edit Quote"}</h2>
            <DynamicQuoteBuilder
              {...quoteData}
              locale={locale}
              onSubmit={handleSaveEdit}
              onCancel={() => setEditOpen(false)}
              editMode
            />
          </div>
        </div>
      )}
    </>
  );
}
