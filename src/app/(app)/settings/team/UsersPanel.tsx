"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type Locale } from "@/lib/i18n";

const ROLES = ["ADMIN", "SALES_MANAGER", "SALES_REP", "FINANCE", "MARKETING"] as const;
type Role = (typeof ROLES)[number];

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  locale: string;
  isActive: boolean;
  teams: { id: string; name: string }[];
  googleId: string | null;
  createdAt: Date | string;
};

type Team = { id: string; name: string };

export default function UsersPanel({
  locale,
  users,
  teams,
}: {
  locale: Locale;
  users: User[];
  teams: Team[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SALES_REP" as Role,
    locale: "en" as "en" | "ar",
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, teamIds: [] }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error?.toString() ?? "Failed");
      return;
    }
    setForm({ name: "", email: "", password: "", role: "SALES_REP", locale: "en" });
    setAdding(false);
    router.refresh();
  }

  async function patch(id: string, data: Record<string, unknown>) {
    setBusy(true);
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    setBusy(false);
    router.refresh();
  }

  async function resetPassword(id: string) {
    const pw = prompt(locale === "ar" ? "كلمة المرور الجديدة (8 أحرف على الأقل):" : "New password (min 8 chars):");
    if (!pw || pw.length < 8) return;
    await patch(id, { password: pw });
    alert(locale === "ar" ? "تم تحديث كلمة المرور." : "Password updated.");
  }

  return (
    <div className="card">
      <div className="card-header">
        <span>{locale === "ar" ? "أعضاء الفريق" : "Team members"}</span>
        <button
          className="btn-primary text-[12px] py-1 px-2"
          onClick={() => setAdding((v) => !v)}
        >
          {adding
            ? (locale === "ar" ? "إغلاق" : "Close")
            : (locale === "ar" ? "إضافة عضو" : "Add member")}
        </button>
      </div>

      {adding && (
        <div className="border-b border-ink-100 p-4 bg-slate-50">
          <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">{locale === "ar" ? "الاسم" : "Name"}</label>
              <input className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">{locale === "ar" ? "كلمة المرور" : "Password"}</label>
              <input className="input" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label">{locale === "ar" ? "الدور" : "Role"}</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{locale === "ar" ? "اللغة" : "Locale"}</label>
              <select className="input" value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value as "en" | "ar" })}>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <button className="btn-primary" disabled={busy}>
                {locale === "ar" ? "إنشاء المستخدم" : "Create user"}
              </button>
              {error && <span className="text-[12px] text-rose-600">{error}</span>}
            </div>
          </form>
          <p className="text-[12px] text-ink-400 mt-2">
            {locale === "ar"
              ? "لإضافة هذا المستخدم إلى فريق، استخدم قسم الفرق أعلاه."
              : "To assign this user to a team, use the Teams section above."}
          </p>
        </div>
      )}

      <table className="table-modern">
        <thead>
          <tr>
            <th>{locale === "ar" ? "العضو" : "Member"}</th>
            <th>{locale === "ar" ? "الدور" : "Role"}</th>
            <th>{locale === "ar" ? "الفرق" : "Teams"}</th>
            <th>{locale === "ar" ? "الحالة" : "Status"}</th>
            <th className="text-end">{locale === "ar" ? "إجراءات" : "Actions"}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={!u.isActive ? "opacity-60" : ""}>
              <td>
                <div className="font-medium text-ink-800">{u.name}</div>
                <div className="text-[12px] text-ink-500">{u.email}{u.googleId && <span className="ms-2 text-emerald-600">· Google</span>}</div>
              </td>
              <td>
                <select
                  className="input text-[12px] py-1"
                  value={u.role}
                  onChange={(e) => patch(u.id, { role: e.target.value })}
                  disabled={busy}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {u.teams.length === 0
                    ? <span className="text-[12px] text-ink-400">—</span>
                    : u.teams.map((t) => (
                        <span key={t.id} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-100 text-violet-700 border border-violet-200">
                          {t.name}
                        </span>
                      ))}
                </div>
              </td>
              <td>
                <span className={`pill ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-500"}`}>
                  {u.isActive ? (locale === "ar" ? "نشط" : "Active") : (locale === "ar" ? "موقوف" : "Disabled")}
                </span>
              </td>
              <td className="text-end">
                <div className="inline-flex gap-1">
                  <button className="btn-outline text-[12px] py-1 px-2" onClick={() => patch(u.id, { isActive: !u.isActive })}>
                    {u.isActive ? (locale === "ar" ? "إيقاف" : "Disable") : (locale === "ar" ? "تفعيل" : "Enable")}
                  </button>
                  <button className="btn-outline text-[12px] py-1 px-2" onClick={() => resetPassword(u.id)}>
                    {locale === "ar" ? "كلمة مرور" : "Reset password"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan={5} className="text-center text-ink-400 py-6">{locale === "ar" ? "لا يوجد مستخدمون." : "No users."}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
