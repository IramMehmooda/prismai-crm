"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

type Item = { href: string; label: string; icon: IconName };

export default function SidebarNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 py-2">
      {items.map((n) => {
        const active = pathname === n.href || pathname?.startsWith(n.href + "/");
        return (
          <Link key={n.href} href={n.href} className={`nav-link ${active ? "nav-link-active" : ""}`}>
            <Icon name={n.icon} size={18} className="opacity-90" />
            <span className="truncate">{n.label}</span>
            {active && <span className="ms-auto rtl:ms-0 rtl:me-auto"><Icon name="chevron-right" size={14}/></span>}
          </Link>
        );
      })}
    </nav>
  );
}
