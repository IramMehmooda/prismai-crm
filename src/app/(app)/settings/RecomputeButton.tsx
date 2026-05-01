"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/lib/i18n";

export default function RecomputeButton({ locale, leadCount }: { locale: Locale; leadCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-[11px] text-leaf-700">{msg}</span>}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true); setMsg(null);
          const r = await fetch("/api/scoring/run", { method: "POST" });
          const j = await r.json().catch(() => ({}));
          setBusy(false);
          if (r.ok) {
            setMsg(locale === "ar" ? `تم تقييم ${j.count ?? leadCount} عميل` : `Scored ${j.count ?? leadCount} leads`);
            router.refresh();
          } else setMsg("Failed");
        }}
        className="btn-outline !py-1 !px-3 !text-xs"
      >
        <Icon name="zap" size={12}/> {locale === "ar" ? "إعادة حساب التقييمات" : "Recompute scores"}
      </button>
    </div>
  );
}
