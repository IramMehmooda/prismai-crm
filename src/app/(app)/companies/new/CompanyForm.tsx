"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

type CompanyFormState = {
  name: string;
  nameAr: string;
  industry: string;
  region: string;
  website: string;
  vatNumber: string;
  size: string;
};

export default function CompanyForm({
  locale,
  initialData,
  endpoint = "/api/companies",
  redirectTo = "/companies",
  mode = "create",
}: {
  locale: Locale;
  initialData?: CompanyFormState;
  endpoint?: string;
  redirectTo?: string;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<CompanyFormState>(initialData ?? {
    name: "", nameAr: "", industry: "", region: "Riyadh", website: "", vatNumber: "", size: "MID",
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
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { setError("Failed to save"); return; }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label={t(locale, "name")}><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="الاسم بالعربية"><input className="input" dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t(locale, "industry")}><input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></Field>
        <Field label={t(locale, "region")}>
          <select className="input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
            {["Riyadh","Eastern","Jeddah","Other"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Website"><input className="input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
        <Field label="VAT #"><input className="input" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} /></Field>
        <Field label="Size">
          <select className="input" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
            {["SMB","MID","ENT"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
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
