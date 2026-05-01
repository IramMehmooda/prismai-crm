"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

type Opt = { id: string; name: string };

export default function ActivityForm({ leads, contacts, opportunities, locale }: { leads: Opt[]; contacts: Opt[]; opportunities: Opt[]; locale: Locale }) {
  const router = useRouter();
  const [form, setForm] = useState({
    type: "NOTE", subject: "", body: "", leadId: "", contactId: "", opportunityId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        leadId: form.leadId || null,
        contactId: form.contactId || null,
        opportunityId: form.opportunityId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) { setError("Failed"); return; }
    setForm({ type: "NOTE", subject: "", body: "", leadId: "", contactId: "", opportunityId: "" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={t(locale, "type")}>
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {["NOTE","CALL","EMAIL","WHATSAPP","MEETING"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label={t(locale, "subject")}>
        <input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      </Field>
      <Field label={t(locale, "body")}>
        <textarea className="input min-h-[80px]" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t(locale, "leads")}>
          <select className="input" value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
            <option value="">—</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label={t(locale, "contacts")}>
          <select className="input" value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
            <option value="">—</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label={locale === "ar" ? "الفرصة" : "Opportunity"}>
        <select className="input" value={form.opportunityId} onChange={(e) => setForm({ ...form, opportunityId: e.target.value })}>
          <option value="">—</option>
          {opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.name}</option>)}
        </select>
      </Field>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "..." : t(locale, "save")}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
