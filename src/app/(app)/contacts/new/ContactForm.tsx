"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

type ContactFormState = {
  firstName: string;
  lastName: string;
  nameAr: string;
  email: string;
  phone: string;
  whatsapp: string;
  title: string;
  companyId: string;
};

export default function ContactForm({
  companies,
  locale,
  initialData,
  endpoint = "/api/contacts",
  redirectTo = "/contacts",
  mode = "create",
}: {
  companies: { id: string; name: string }[];
  locale: Locale;
  initialData?: ContactFormState;
  endpoint?: string;
  redirectTo?: string;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<ContactFormState>(initialData ?? {
    firstName: "", lastName: "", nameAr: "", email: "", phone: "", whatsapp: "", title: "", companyId: "",
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
      body: JSON.stringify({ ...form, companyId: form.companyId || null }),
    });
    setSaving(false);
    if (!res.ok) { setError("Failed to save"); return; }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name"><input className="input" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
        <Field label="Last name"><input className="input" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
      </div>
      <Field label="الاسم بالعربية"><input className="input" dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t(locale, "title")}><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label={t(locale, "company")}>
          <select className="input" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            <option value="">—</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label={t(locale, "email")}><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label={t(locale, "phone")}><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label={t(locale, "whatsapp")}><input className="input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => history.back()} className="btn-ghost">{t(locale, "cancel")}</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "..." : t(locale, "save")}</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
