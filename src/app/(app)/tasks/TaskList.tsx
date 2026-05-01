"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/lib/i18n";

type Task = {
  id: string; title: string; description: string | null; status: string; priority: string;
  dueAt: string | Date | null;
  assignee: { name: string } | null;
  creator: { id: string; name: string } | null;
  lead: { id: string; title: string } | null;
  opportunity: { id: string; title: string; contact?: { email: string | null; firstName: string; lastName: string } | null; company?: { name: string } | null } | null;
};

type EditDraft = {
  title: string;
  description: string;
  dueAt: string;
  priority: string;
};

export default function TaskList({ tasks, locale }: { tasks: Task[]; locale: Locale }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: string, status: string) {
    setBusy(id);
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: status === "DONE" ? "OPEN" : "DONE" }),
    });
    if (status !== "DONE") {
      setCelebrating(id);
      setTimeout(() => setCelebrating((current) => current === id ? null : current), 1200);
    }
    setBusy(null);
    router.refresh();
  }

  async function pushToTomorrow(id: string) {
    setBusy(id);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dueAt: toDateInputValue(tomorrow) }),
    });
    setBusy(null);
    router.refresh();
  }

  function startEdit(task: Task) {
    setError(null);
    setEditingId(task.id);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      dueAt: task.dueAt ? toDateInputValue(task.dueAt) : "",
      priority: task.priority,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setError(null);
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    setBusy(id);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title: draft.title,
        description: draft.description || null,
        dueAt: draft.dueAt || null,
        priority: draft.priority,
      }),
    });
    if (!res.ok) {
      setError(locale === "ar" ? "تعذر تحديث المهمة" : "Could not update task");
      setBusy(null);
      return;
    }
    setBusy(null);
    cancelEdit();
    router.refresh();
  }

  async function removeTask(id: string) {
    const confirmed = window.confirm(locale === "ar" ? "حذف هذه المهمة؟" : "Delete this task?");
    if (!confirmed) return;
    setBusy(id);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setError(locale === "ar" ? "تعذر حذف المهمة" : "Could not delete task");
      setBusy(null);
      return;
    }
    if (editingId === id) cancelEdit();
    setBusy(null);
    router.refresh();
  }

  return (
    <ul className="divide-y divide-ink-100">
      {tasks.map((tk) => {
        const done = tk.status === "DONE";
        const due = normalizeDueAtValue(tk.dueAt);
        const today = todayDateKey();
        const overdue = !done && due && due < today;
        const contactEmail = tk.opportunity?.contact?.email ?? null;
        const isEditing = editingId === tk.id && draft;
        return (
          <li key={tk.id} className={`group px-5 py-3 flex items-start gap-3 transition ${done ? "bg-leaf-50/40" : "hover:bg-ink-50/60"}`}>
            <button
              onClick={() => toggle(tk.id, tk.status)}
              disabled={busy === tk.id}
              className={`w-5 h-5 rounded border grid place-items-center transition shrink-0 ${done ? "bg-leaf-500 border-leaf-500 text-white" : "border-ink-300 hover:border-leaf-500"}`}
              aria-label="Toggle done"
            >
              {done && <Icon name="check" size={12}/>}
            </button>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="rounded-lg border border-ink-200 bg-white p-3 space-y-3">
                  <div>
                    <label className="label">{locale === "ar" ? "العنوان" : "Title"}</label>
                    <input
                      className="input"
                      value={draft.title}
                      onChange={(e) => setDraft((current) => current ? { ...current, title: e.target.value } : current)}
                    />
                  </div>
                  <div>
                    <label className="label">{locale === "ar" ? "وصف" : "Description"}</label>
                    <textarea
                      rows={2}
                      className="input"
                      value={draft.description}
                      onChange={(e) => setDraft((current) => current ? { ...current, description: e.target.value } : current)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">{locale === "ar" ? "الاستحقاق" : "Due date"}</label>
                      <input
                        type="date"
                        className="input"
                        value={draft.dueAt}
                        onChange={(e) => setDraft((current) => current ? { ...current, dueAt: e.target.value } : current)}
                      />
                    </div>
                    <div>
                      <label className="label">{locale === "ar" ? "الأولوية" : "Priority"}</label>
                      <select
                        className="input"
                        value={draft.priority}
                        onChange={(e) => setDraft((current) => current ? { ...current, priority: e.target.value } : current)}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                  {error && <div className="text-xs text-accent-red">{error}</div>}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(tk.id)}
                      disabled={busy === tk.id || !draft.title.trim()}
                      className="btn-primary"
                    >
                      {busy === tk.id ? "…" : (locale === "ar" ? "حفظ" : "Save")}
                    </button>
                    <button type="button" onClick={cancelEdit} className="btn-outline">
                      {locale === "ar" ? "إلغاء" : "Cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-[13.5px] truncate transition ${done ? "line-through text-ink-400" : "text-ink-700"}`}>{tk.title}</div>
                      {tk.description && <div className={`text-[12px] mt-1 ${done ? "text-ink-300 line-through" : "text-ink-500"}`}>{tk.description}</div>}
                    </div>
                    {celebrating === tk.id && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-leaf-600"><Icon name="sparkles" size={12}/> {locale === "ar" ? "أحسنت" : "Nice"}</span>}
                  </div>
                  <div className="text-[11px] text-ink-400 flex flex-wrap gap-2 mt-1">
                    {tk.assignee && <span>{tk.assignee.name}</span>}
                    {tk.creator && <span>· {locale === "ar" ? "منشئ" : "By"}: {tk.creator.name}</span>}
                    {tk.lead && !tk.opportunity && (
                      <span>
                        · <Link href={`/leads/${tk.lead.id}`} className="text-brand-700 hover:underline font-medium">{tk.lead.title}</Link>
                      </span>
                    )}
                    {tk.opportunity && (
                      <span>
                        · <Link href={`/pipeline/${tk.opportunity.id}`} className="text-brand-700 hover:underline font-medium">{tk.opportunity.title}</Link>
                        {tk.opportunity.company?.name ? ` · ${tk.opportunity.company.name}` : ""}
                      </span>
                    )}
                    {due && <span className={overdue ? "text-rose-700 font-semibold" : ""}>· {formatTaskDate(due, locale)}</span>}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-start gap-2 shrink-0">
              <span className={`pill ${prioTone(tk.priority)}`}>{tk.priority}</span>
              <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition">
                <button
                  onClick={() => isEditing ? cancelEdit() : startEdit(tk)}
                  disabled={busy === tk.id}
                  className="w-8 h-8 rounded-md border border-ink-200 bg-white hover:bg-ink-50 grid place-items-center text-ink-600"
                  title={locale === "ar" ? "تعديل المهمة" : "Edit task"}
                >
                  <Icon name="edit" size={14}/>
                </button>
                <button
                  onClick={() => removeTask(tk.id)}
                  disabled={busy === tk.id}
                  className="w-8 h-8 rounded-md border border-ink-200 bg-white hover:bg-ink-50 grid place-items-center text-ink-600"
                  title={locale === "ar" ? "حذف المهمة" : "Delete task"}
                >
                  <Icon name="trash" size={14}/>
                </button>
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="w-8 h-8 rounded-md border border-ink-200 bg-white hover:bg-ink-50 grid place-items-center text-ink-600"
                    title={locale === "ar" ? "إرسال بريد" : "Email contact"}
                  >
                    <Icon name="mail" size={14}/>
                  </a>
                )}
                {tk.opportunity && (
                  <Link
                    href={`/pipeline/${tk.opportunity.id}`}
                    className="w-8 h-8 rounded-md border border-ink-200 bg-white hover:bg-ink-50 grid place-items-center text-ink-600"
                    title={locale === "ar" ? "فتح الفرصة" : "Open opportunity"}
                  >
                    <Icon name="briefcase" size={14}/>
                  </Link>
                )}
                {tk.lead && !tk.opportunity && (
                  <Link
                    href={`/leads/${tk.lead.id}`}
                    className="w-8 h-8 rounded-md border border-ink-200 bg-white hover:bg-ink-50 grid place-items-center text-ink-600"
                    title={locale === "ar" ? "فتح العميل المحتمل" : "Open lead"}
                  >
                    <Icon name="trend-up" size={14}/>
                  </Link>
                )}
                {!done && (
                  <button
                    onClick={() => pushToTomorrow(tk.id)}
                    disabled={busy === tk.id}
                    className="w-8 h-8 rounded-md border border-ink-200 bg-white hover:bg-ink-50 grid place-items-center text-ink-600"
                    title={locale === "ar" ? "تأجيل للغد" : "Push to tomorrow"}
                  >
                    <Icon name="calendar" size={14}/>
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function toDateInputValue(value: string | Date) {
  return normalizeDueAtValue(value);
}

function formatTaskDate(value: string | Date, locale: Locale) {
  const normalized = normalizeDueAtValue(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return normalized;
  const [, year, month, day] = match;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
  }).format(new Date(Number(year), Number(month) - 1, Number(day)));
}

function todayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDueAtValue(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") {
    const exact = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (exact) return value;
    const prefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (prefix) return `${prefix[1]}-${prefix[2]}-${prefix[3]}`;
  }
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prioTone(p: string) {
  switch (p) {
    case "HIGH": return "bg-rose-100 text-rose-800 border border-rose-200";
    case "LOW": return "bg-sky-100 text-sky-800 border border-sky-200";
    default: return "bg-amber-100 text-amber-800 border border-amber-200";
  }
}
