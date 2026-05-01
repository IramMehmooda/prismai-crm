"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

type Opt = { id: string; name: string };

type LeadFormState = {
  title: string;
  source: string;
  status: string;
  score: number;
  estimatedValue: string;
  notes: string;
  companyId: string;
  contactId: string;
};

export default function LeadForm({
  companies, contacts, locale, initialData, endpoint = "/api/leads", redirectTo = "/leads", mode = "create",
}: { companies: Opt[]; contacts: Opt[]; locale: Locale; initialData?: LeadFormState; endpoint?: string; redirectTo?: string; mode?: "create" | "edit" }) {
  const router = useRouter();
  const [form, setForm] = useState<LeadFormState>(initialData ?? {
    title: "",
    source: "WEB",
    status: "NEW",
    score: 0,
    estimatedValue: "",
    notes: "",
    companyId: "",
    contactId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(endpoint, {
      method: mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        score: Number(form.score) || 0,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
        companyId: form.companyId || null,
        contactId: form.contactId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) { setError("Failed to save"); return; }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <Field label={t(locale, "title")}>
        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t(locale, "source")}>
          <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
            {["WEB","REFERRAL","TRADE_SHOW","LINKEDIN","COLD","OTHER"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label={t(locale, "status")}>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {["NEW","CONTACTED","QUALIFIED","DISQUALIFIED","CONVERTED"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t(locale, "company")}>
          <select className="input" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            <option value="">—</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t(locale, "contact")}>
          <select className="input" value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
            <option value="">—</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t(locale, "score")}>
          <input className="input" type="number" min={0} max={100} value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} />
        </Field>
        <Field label={t(locale, "value")}>
          <input className="input" type="number" min={0} value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} />
        </Field>
      </div>
      <Field label={t(locale, "notes")}>
        <textarea className="input min-h-[90px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => history.back()} className="btn-ghost">{t(locale, "cancel")}</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "..." : t(locale, "save")}</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
