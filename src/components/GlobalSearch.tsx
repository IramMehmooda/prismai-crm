"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

type Result = { id: string; type: string; title: string; subtitle?: string; href: string };

const TYPE_COLOR: Record<string, string> = {
  Lead: "bg-sky-100 text-sky-700",
  Contact: "bg-violet-100 text-violet-700",
  Company: "bg-amber-100 text-amber-700",
  Opportunity: "bg-emerald-100 text-emerald-700",
  Quote: "bg-rose-100 text-rose-700",
  Product: "bg-slate-200 text-slate-700",
};

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open on Cmd/Ctrl+K or "/" (when not focused on an input).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (k === "/" && !open) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          setOpen(true);
        }
      }
      if (k === "escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    if (!open) { setQ(""); setResults([]); setActive(0); }
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    if (trimmed.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setActive(0);
      } finally { setLoading(false); }
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  function go(r: Result) {
    setOpen(false);
    router.push(r.href);
  }

  function onKeyNav(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]); }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Search (⌘K)"
        className="hidden md:inline-flex items-center gap-2 h-8 px-2.5 rounded text-white/70 hover:text-white hover:bg-white/10 text-[12px]"
      >
        <Icon name="search" size={14} />
        <span className="hidden lg:inline">Search</span>
        <kbd className="hidden lg:inline px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-mono text-white/80">⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 sm:p-10"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 h-12 border-b border-slate-100">
              <Icon name="search" size={16} className="text-slate-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyNav}
                placeholder="Search leads, contacts, companies, deals, quotes, products…"
                className="flex-1 outline-none text-sm bg-transparent text-slate-900 placeholder:text-slate-400"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-500">esc</kbd>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading && <div className="p-4 text-sm text-slate-500">Searching…</div>}
              {!loading && q.trim().length < 2 && (
                <div className="p-4 text-sm text-slate-500">
                  Type at least 2 characters. Try <span className="font-mono text-slate-700">aramco</span>, <span className="font-mono text-slate-700">pump</span>, or a quote number.
                </div>
              )}
              {!loading && q.trim().length >= 2 && results.length === 0 && (
                <div className="p-4 text-sm text-slate-500">No matches.</div>
              )}
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => go(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 ${i === active ? "bg-slate-50" : ""} hover:bg-slate-50`}
                >
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${TYPE_COLOR[r.type] ?? "bg-slate-100 text-slate-700"}`}>
                    {r.type}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-slate-900 truncate">{r.title}</span>
                    {r.subtitle && <span className="block text-[11px] text-slate-500 truncate">{r.subtitle}</span>}
                  </span>
                  <Icon name="chevron-right" size={14} className="text-slate-400" />
                </button>
              ))}
            </div>

            <div className="px-4 h-9 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-500 bg-slate-50">
              <span><kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↓</kbd> navigate</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↵</kbd> open</span>
              <span className="ms-auto">Powered by prismAI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
