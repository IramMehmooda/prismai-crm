"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/lib/i18n";

export default function OpportunityStageActions({
  locale,
  opportunityId,
  wonStageId,
  lostStageId,
  isWon,
  isLost,
}: {
  locale: Locale;
  opportunityId: string;
  wonStageId: string | null;
  lostStageId: string | null;
  isWon: boolean;
  isLost: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move(stageId: string, closeReason?: string) {
    setBusy(true);
    const res = await fetch("/api/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: opportunityId, stageId, ...(closeReason ? { closeReason } : {}) }),
    });
    setBusy(false);
    if (!res.ok) {
      alert(locale === "ar" ? "تعذر تحديث الفرصة" : "Failed to update opportunity");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {wonStageId && !isWon && (
        <button disabled={busy} onClick={() => move(wonStageId)} className="btn-primary">
          <Icon name="check" size={14} /> {locale === "ar" ? "تمييز كمربوحة" : "Mark won"}
        </button>
      )}
      {lostStageId && !isLost && (
        <button
          disabled={busy}
          onClick={() => {
            const reason = window.prompt(locale === "ar" ? "سبب الخسارة" : "Reason for loss") ?? "";
            move(lostStageId, reason || undefined);
          }}
          className="btn-outline text-rose-600 border-rose-200 hover:bg-rose-50"
        >
          <Icon name="x" size={14} /> {locale === "ar" ? "تمييز كمفقودة" : "Mark lost"}
        </button>
      )}
    </div>
  );
}