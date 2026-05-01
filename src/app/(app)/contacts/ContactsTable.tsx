"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const grads = ["bg-grad-brand", "bg-grad-aurora", "bg-grad-mint", "bg-grad-sunset"];

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  nameAr: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  title: string | null;
  company: { name: string } | null;
  owner: { name: string } | null;
};

type Filters = { name: string; title: string; company: string; email: string; phone: string; owner: string };

function FilterInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Filter…"}
      className="mt-1.5 w-full rounded border border-ink-200 bg-white px-2 py-1 text-[11px] font-normal normal-case tracking-normal text-ink-700 placeholder:text-ink-300 focus:border-leaf-500 focus:outline-none focus:ring-1 focus:ring-leaf-500/30 transition"
    />
  );
}

export default function ContactsTable({
  contacts,
  locale,
}: {
  contacts: Contact[];
  locale: Locale;
}) {
  const [filters, setFilters] = useState<Filters>({
    name: "",
    title: "",
    company: "",
    email: "",
    phone: "",
    owner: "",
  });

  function setF(key: keyof Filters) {
    return (v: string) => setFilters((f) => ({ ...f, [key]: v }));
  }

  const lc = (s: string) => s.toLowerCase();

  const filtered = contacts.filter((c) => {
    const fullName = `${c.firstName} ${c.lastName}`;
    if (filters.name && !lc(fullName).includes(lc(filters.name))) return false;
    if (filters.title && !lc(c.title ?? "").includes(lc(filters.title))) return false;
    if (filters.company && !lc(c.company?.name ?? "").includes(lc(filters.company))) return false;
    if (filters.email && !lc(c.email ?? "").includes(lc(filters.email))) return false;
    if (filters.phone && !lc(c.phone ?? "").includes(lc(filters.phone))) return false;
    if (filters.owner && !lc(c.owner?.name ?? "").includes(lc(filters.owner))) return false;
    return true;
  });

  const hasFilter = Object.values(filters).some(Boolean);

  return (
    <div className="card overflow-hidden">
      {hasFilter && (
        <div className="px-5 py-2 bg-leaf-50 border-b border-leaf-100 flex items-center justify-between text-[11px] text-leaf-700">
          <span>{filtered.length} of {contacts.length} {locale === "ar" ? "نتيجة" : "results"}</span>
          <button
            onClick={() => setFilters({ name: "", title: "", company: "", email: "", phone: "", owner: "" })}
            className="font-semibold hover:underline"
          >
            {locale === "ar" ? "مسح الفلاتر" : "Clear filters"}
          </button>
        </div>
      )}
      <table className="table-modern">
        <thead>
          <tr>
            <th>
              <div>{t(locale, "name")}</div>
              <FilterInput value={filters.name} onChange={setF("name")} placeholder={locale === "ar" ? "بحث..." : "Search…"} />
            </th>
            <th>
              <div>{t(locale, "title")}</div>
              <FilterInput value={filters.title} onChange={setF("title")} placeholder={locale === "ar" ? "بحث..." : "Search…"} />
            </th>
            <th>
              <div>{t(locale, "company")}</div>
              <FilterInput value={filters.company} onChange={setF("company")} placeholder={locale === "ar" ? "بحث..." : "Search…"} />
            </th>
            <th>
              <div>{t(locale, "email")}</div>
              <FilterInput value={filters.email} onChange={setF("email")} placeholder={locale === "ar" ? "بحث..." : "Search…"} />
            </th>
            <th>
              <div>{t(locale, "phone")}</div>
              <FilterInput value={filters.phone} onChange={setF("phone")} placeholder={locale === "ar" ? "بحث..." : "Search…"} />
            </th>
            <th>
              <div>{t(locale, "owner")}</div>
              <FilterInput value={filters.owner} onChange={setF("owner")} placeholder={locale === "ar" ? "بحث..." : "Search…"} />
            </th>
            <th>{locale === "ar" ? "الإجراءات" : "Actions"}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c, i) => (
            <tr key={c.id}>
              <td>
                <Link href={`/contacts/${c.id}`} className="flex items-center gap-3 group">
                  <span className={`avatar w-9 h-9 ${grads[i % grads.length]}`}>
                    {`${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase()}
                  </span>
                  <div>
                    <div className="font-semibold text-brand-700 group-hover:underline">{c.firstName} {c.lastName}</div>
                    {c.nameAr && <div className="text-xs text-slate-500">{c.nameAr}</div>}
                  </div>
                </Link>
              </td>
              <td>{c.title ?? "—"}</td>
              <td>{c.company?.name ?? "—"}</td>
              <td>
                {c.email ? (
                  <a className="inline-flex items-center gap-1.5 text-brand-700 hover:underline" href={`mailto:${c.email}`}>
                    <Icon name="mail" size={14} /> {c.email}
                  </a>
                ) : "—"}
              </td>
              <td>
                <div className="flex items-center gap-2">
                  {c.phone && <span className="pill bg-slate-100 text-slate-700"><Icon name="phone" size={12} /> {c.phone}</span>}
                  {c.whatsapp && <span className="pill bg-emerald-100 text-emerald-700"><Icon name="whatsapp" size={12} /> WA</span>}
                </div>
              </td>
              <td>{c.owner?.name ?? "—"}</td>
              <td>
                <Link href={`/contacts/${c.id}/edit`} className="text-brand-700 hover:underline text-sm font-medium">
                  {locale === "ar" ? "تعديل" : "Edit"}
                </Link>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                {hasFilter
                  ? (locale === "ar" ? "لا توجد نتائج مطابقة." : "No contacts match your filters.")
                  : (locale === "ar" ? "لا توجد جهات اتصال بعد." : "No contacts yet.")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
