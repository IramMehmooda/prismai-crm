"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type Locale } from "@/lib/i18n";

type UserSummary = { id: string; name: string; email: string; role: string };
type Member = { id: string; name: string; email: string; role: string; isActive: boolean };
type Team = { id: string; name: string; _count: { members: number }; members: Member[] };

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-700",
  SALES_MANAGER: "bg-emerald-100 text-emerald-700",
  SALES_REP: "bg-sky-100 text-sky-700",
  FINANCE: "bg-amber-100 text-amber-700",
  MARKETING: "bg-rose-100 text-rose-700",
};

export default function TeamsPanel({
  locale,
  teams,
  allUsers,
}: {
  locale: Locale;
  teams: Team[];
  allUsers: UserSummary[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // per-team selected userId for the add-member dropdown
  const [addingUser, setAddingUser] = useState<Record<string, string>>({});

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json())?.error?.toString() ?? "Failed");
      return;
    }
    setName("");
    router.refresh();
  }

  async function save(id: string, newName: string) {
    setBusy(true);
    await fetch("/api/teams", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, name: newName }),
    });
    setBusy(false);
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm(locale === "ar" ? "حذف هذا الفريق؟ سيتم إزالة جميع الأعضاء." : "Delete this team? All members will be removed from it.")) return;
    setBusy(true);
    await fetch("/api/teams", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(false);
    if (expanded === id) setExpanded(null);
    router.refresh();
  }

  async function addMember(teamId: string) {
    const userId = addingUser[teamId];
    if (!userId) return;
    setBusy(true);
    await fetch("/api/teams/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId, userId }),
    });
    setBusy(false);
    setAddingUser((prev) => ({ ...prev, [teamId]: "" }));
    router.refresh();
  }

  async function removeMember(teamId: string, userId: string) {
    setBusy(true);
    await fetch("/api/teams/members", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId, userId }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card">
      <div className="card-header">
        <span>{locale === "ar" ? "الفرق" : "Teams"}</span>
        <span className="text-[12px] text-ink-500">{teams.length}</span>
      </div>
      <div className="card-body space-y-4">
        <form onSubmit={create} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder={locale === "ar" ? "اسم الفريق الجديد" : "New team name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
          <button className="btn-primary" disabled={busy || name.trim().length < 2}>
            {locale === "ar" ? "إضافة" : "Add team"}
          </button>
        </form>
        {error && <div className="text-[12px] text-rose-600">{error}</div>}

        <table className="table-modern">
          <thead>
            <tr>
              <th>{locale === "ar" ? "الفريق" : "Team"}</th>
              <th className="text-end">{locale === "ar" ? "الأعضاء" : "Members"}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const memberIds = new Set(t.members.map((m) => m.id));
              const nonMembers = allUsers.filter((u) => !memberIds.has(u.id));
              return (
                <>
                  <tr
                    key={t.id}
                    className="cursor-pointer hover:bg-slate-50 transition"
                    onClick={() => {
                      if (editing?.id === t.id) return;
                      setExpanded((prev) => (prev === t.id ? null : t.id));
                    }}
                  >
                    <td>
                      {editing?.id === t.id ? (
                        <input
                          className="input"
                          value={editing.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditing({ id: t.id, name: e.target.value })}
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-ink-800 flex items-center gap-1.5">
                          <span className={`transition-transform ${expanded === t.id ? "rotate-90" : ""} text-ink-400 text-[10px]`}>▶</span>
                          {t.name}
                        </span>
                      )}
                    </td>
                    <td className="text-end tabular-nums">{t._count.members}</td>
                    <td className="text-end" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-1">
                        {editing?.id === t.id ? (
                          <>
                            <button className="btn-primary text-[12px] py-1 px-2" disabled={busy} onClick={() => save(t.id, editing.name)}>
                              {locale === "ar" ? "حفظ" : "Save"}
                            </button>
                            <button className="btn-outline text-[12px] py-1 px-2" onClick={() => setEditing(null)}>
                              {locale === "ar" ? "إلغاء" : "Cancel"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn-outline text-[12px] py-1 px-2" onClick={() => setEditing({ id: t.id, name: t.name })}>
                              {locale === "ar" ? "تعديل" : "Rename"}
                            </button>
                            <button className="btn-outline text-[12px] py-1 px-2 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => remove(t.id)}>
                              {locale === "ar" ? "حذف" : "Delete"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === t.id && (
                    <tr key={`${t.id}-exp`}>
                      <td colSpan={3} className="p-0">
                        <div className="bg-slate-50 border-t border-ink-100 px-4 py-3 space-y-3">
                          {/* Add member row */}
                          <div className="flex gap-2 items-center">
                            <select
                              className="input flex-1 text-[12.5px] py-1"
                              value={addingUser[t.id] ?? ""}
                              onChange={(e) => setAddingUser((prev) => ({ ...prev, [t.id]: e.target.value }))}
                            >
                              <option value="">{locale === "ar" ? "— اختر عضواً —" : "— Select a member to add —"}</option>
                              {nonMembers.map((u) => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                              ))}
                            </select>
                            <button
                              className="btn-primary text-[12px] py-1 px-3"
                              disabled={busy || !addingUser[t.id]}
                              onClick={() => addMember(t.id)}
                            >
                              {locale === "ar" ? "إضافة" : "Add"}
                            </button>
                          </div>

                          {/* Current members */}
                          {t.members.length === 0 ? (
                            <p className="text-[12px] text-ink-400">{locale === "ar" ? "لا يوجد أعضاء." : "No members yet."}</p>
                          ) : (
                            <table className="w-full text-[12.5px]">
                              <tbody>
                                {t.members.map((m) => (
                                  <tr key={m.id} className={!m.isActive ? "opacity-50" : ""}>
                                    <td className="py-1.5 pr-4">
                                      <span className="font-medium text-ink-800">{m.name}</span>
                                      <span className="text-ink-500 ms-2">{m.email}</span>
                                    </td>
                                    <td className="py-1.5 pr-4">
                                      <span className={`pill text-[11px] ${ROLE_COLOR[m.role] ?? "bg-ink-100 text-ink-600"}`}>{m.role}</span>
                                    </td>
                                    <td className="py-1.5 text-end">
                                      <button
                                        className="text-rose-500 hover:text-rose-700 text-[12px] font-medium"
                                        disabled={busy}
                                        onClick={() => removeMember(t.id, m.id)}
                                      >
                                        {locale === "ar" ? "إزالة" : "Remove"}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {teams.length === 0 && (
              <tr><td colSpan={3} className="text-center text-ink-400 py-6">{locale === "ar" ? "لا توجد فرق بعد." : "No teams yet."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
