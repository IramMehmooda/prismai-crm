"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

type Props = {
  name: string;
  email: string;
  role: string;
  locale: string;
  initials: string;
  image?: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  SALES_MANAGER: "Sales Manager",
  SALES_REP: "Sales Representative",
  FINANCE: "Finance",
  MARKETING: "Marketing",
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-700",
  SALES_MANAGER: "bg-emerald-100 text-emerald-700",
  SALES_REP: "bg-sky-100 text-sky-700",
  FINANCE: "bg-amber-100 text-amber-700",
  MARKETING: "bg-rose-100 text-rose-700",
};

const ITEMS: { label: string; href: string; icon: IconName; sub?: string }[] = [
  { label: "Your profile", href: "/profile", icon: "contacts", sub: "Account & preferences" },
];

export default function UserMenu({ name, email, role, locale, initials, image }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 h-8 ps-1 pe-2 rounded-full hover:bg-white/10 transition"
        title="Account"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-leaf-500 grid place-items-center text-[11px] font-bold text-white">
            {initials}
          </span>
        )}
        <span className="text-[13px] hidden sm:inline text-white">{name.split(" ")[0]}</span>
        <Icon name="chevron-right" size={12} className={`text-white/70 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-[300px] bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-pop">
          {/* Header card */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-700 text-white">
            <div className="flex items-center gap-3">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/30" />
              ) : (
                <span className="w-12 h-12 rounded-full bg-leaf-500 grid place-items-center text-base font-bold ring-2 ring-white/30">
                  {initials}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{name}</div>
                <div className="text-[12px] text-white/70 truncate">{email}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${ROLE_COLOR[role] ?? "bg-slate-200 text-slate-700"}`}>
                {ROLE_LABEL[role] ?? role}
              </span>
              <span className="text-[11px] text-white/60">· {locale === "ar" ? "العربية" : "English"}</span>
            </div>
          </div>

          {/* Nav items */}
          <div className="py-2">
            {ITEMS.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50"
              >
                <span className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center text-slate-600">
                  <Icon name={it.icon} size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-slate-900">{it.label}</span>
                  {it.sub && <span className="block text-[11px] text-slate-500">{it.sub}</span>}
                </span>
                <Icon name="chevron-right" size={14} className="text-slate-400" />
              </Link>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
