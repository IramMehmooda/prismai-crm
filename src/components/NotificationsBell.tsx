"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
};

const TYPE_META: Record<string, { icon: IconName; color: string }> = {
  QUOTE_APPROVAL_REQUESTED: { icon: "quote", color: "bg-amber-100 text-amber-700" },
  QUOTE_APPROVED: { icon: "check", color: "bg-emerald-100 text-emerald-700" },
  QUOTE_REJECTED: { icon: "quote", color: "bg-rose-100 text-rose-700" },
  QUOTE_SENT: { icon: "quote", color: "bg-sky-100 text-sky-700" },
  QUOTE_ACCEPTED: { icon: "check", color: "bg-emerald-100 text-emerald-700" },
  LEAD_CONVERTED: { icon: "trend-up", color: "bg-emerald-100 text-emerald-700" },
  LEAD_NEW: { icon: "leads", color: "bg-sky-100 text-sky-700" },
  TASK_ASSIGNED: { icon: "tasks", color: "bg-violet-100 text-violet-700" },
  TASK_OVERDUE: { icon: "tasks", color: "bg-rose-100 text-rose-700" },
  GMAIL_SYNCED: { icon: "mail", color: "bg-sky-100 text-sky-700" },
  EMAIL_RECEIVED: { icon: "mail", color: "bg-emerald-100 text-emerald-700" },
  MENTION: { icon: "sparkles", color: "bg-violet-100 text-violet-700" },
};

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const watchRef = useRef(false);

  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } finally { setLoading(false); }
  }

  async function ensureWatch() {
    if (watchRef.current) return;
    watchRef.current = true;
    try {
      await fetch("/api/gmail/watch", { method: "POST" });
    } catch {
      // best-effort
    } finally {
      watchRef.current = false;
    }
  }

  async function refresh() {
    await load();
  }

  // Gmail ingestion is push-driven; the bell refreshes local notification state.
  useEffect(() => {
    ensureWatch();
    refresh();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onFocus() {
      ensureWatch();
      refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Refresh when opened
  useEffect(() => { if (open) load(); }, [open]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  async function openItem(n: Notification) {
    if (!n.readAt) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      });
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x));
    }
    setOpen(false);
    if (n.href) {
      if (/^https?:\/\//i.test(n.href)) {
        window.open(n.href, "_blank", "noopener,noreferrer");
        return;
      }
      router.push(n.href);
    }
  }

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className="relative inline-grid place-items-center w-8 h-8 rounded text-white/70 hover:text-white hover:bg-white/10"
      >
        <Icon name="bell" size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-[360px] max-h-[70vh] bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-pop flex flex-col">
          <div className="flex items-center px-4 h-11 border-b border-slate-100">
            <span className="font-semibold text-sm">Notifications</span>
            {unread > 0 && (
              <span className="ms-2 text-[11px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 font-medium">
                {unread} new
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={markAllRead}
              disabled={unread === 0}
              className="text-[11px] text-slate-500 hover:text-brand-600 disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="p-6 text-sm text-slate-500 text-center">Loading…</div>
            )}
            {!loading && items.length === 0 && (
              <div className="p-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 grid place-items-center mb-3">
                  <Icon name="bell" size={20} className="text-slate-400" />
                </div>
                <div className="text-sm font-medium text-slate-700">All caught up</div>
                <div className="text-[12px] text-slate-500 mt-1">You&apos;ll see new emails, mentions, approvals, leads, and tasks here.</div>
              </div>
            )}
            {items.map((n) => {
              const meta = TYPE_META[n.type] ?? { icon: "sparkles" as IconName, color: "bg-slate-100 text-slate-700" };
              const isUnread = !n.readAt;
              return (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 border-b border-slate-50 ${isUnread ? "bg-sky-50/40" : ""}`}
                >
                  <div className={`w-8 h-8 shrink-0 rounded-lg grid place-items-center ${meta.color}`}>
                    <Icon name={meta.icon} size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 truncate">{n.title}</span>
                      {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />}
                    </div>
                    {n.body && <div className="text-[12px] text-slate-600 mt-0.5 line-clamp-2">{n.body}</div>}
                    <div className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)} ago</div>
                  </div>
                </button>
              );
            })}
          </div>

          {items.length > 0 && (
            <div className="px-4 h-9 border-t border-slate-100 flex items-center justify-center bg-slate-50 text-[11px] text-slate-500">
              Showing latest {items.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
