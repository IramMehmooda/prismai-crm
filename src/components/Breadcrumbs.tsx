"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "./Icon";

export default function Breadcrumbs() {
  const pathname = usePathname() ?? "";
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  let acc = "";
  return (
    <>
      {parts.map((p, i) => {
        acc += "/" + p;
        const last = i === parts.length - 1;
        const label = p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, " ");
        return (
          <span key={acc} className="inline-flex items-center gap-2">
            <Icon name="chevron-right" size={12} className="text-ink-300" />
            {last ? (
              <span className="text-[13px] text-ink-700 font-medium">{label}</span>
            ) : (
              <Link href={acc} className="crumb">{label}</Link>
            )}
          </span>
        );
      })}
    </>
  );
}
