"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { formatSAR, type Locale } from "@/lib/i18n";

type Stage = { id: string; name: string; color: string | null; isWon: boolean; isLost: boolean };
type Opp = {
  id: string; title: string; amount: number; stageId: string; probability: number;
  company: string | null; contact: string | null; owner: string | null; expectedCloseAt: string | null;
};
type Total = { id: string; sum: number; count: number };

export default function KanbanBoard({
  stages, opportunities, totals, locale,
}: { stages: Stage[]; opportunities: Opp[]; totals: Total[]; locale: Locale }) {
  const router = useRouter();
  const [items, setItems] = useState(opportunities);
  const [dragId, setDragId] = useState<string | null>(null);
  const [clickedAfterDragId, setClickedAfterDragId] = useState<string | null>(null);

  async function move(oppId: string, stageId: string) {
    const before = items;
    setItems((cur) => cur.map((o) => (o.id === oppId ? { ...o, stageId } : o)));
    const res = await fetch("/api/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: oppId, stageId }),
    });
    if (!res.ok) {
      setItems(before);
      alert("Failed to move opportunity");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(240px, 1fr))` }}>
      {stages.map((s) => {
        const tot = totals.find((t) => t.id === s.id) ?? { sum: 0, count: 0 };
        const inStage = items.filter((o) => o.stageId === s.id);
        return (
          <div
            key={s.id}
            className="card p-3 min-h-[420px] flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId) { move(dragId, s.id); setDragId(null); } }}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color ?? "#94a3b8" }}/>
                <span className="text-[12px] font-semibold text-ink-700 uppercase tracking-wide">{s.name}</span>
                <span className="pill bg-ink-100 text-ink-600">{tot.count}</span>
              </div>
              <div className="text-[11px] text-ink-500 tabular-nums">{formatSAR(tot.sum, locale)}</div>
            </div>
            <div className="space-y-2 flex-1">
              {inStage.map((o) => (
                <div
                  key={o.id}
                  draggable
                  onDragStart={() => setDragId(o.id)}
                  onDragEnd={() => {
                    setClickedAfterDragId(o.id);
                    setDragId(null);
                    setTimeout(() => setClickedAfterDragId(null), 0);
                  }}
                  onClick={() => {
                    if (clickedAfterDragId === o.id) return;
                    router.push(`/pipeline/${o.id}`);
                  }}
                  className="rounded-md border border-ink-200 bg-white p-3 hover:border-leaf-500 hover:shadow-card cursor-pointer active:cursor-grabbing transition"
                >
                  <div className="text-[13.5px] font-semibold text-ink-900 truncate">{o.title}</div>
                  <div className="text-[11px] text-ink-500 truncate mt-0.5">{o.company ?? "—"}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[12px] font-semibold text-leaf-600 tabular-nums">{formatSAR(o.amount, locale)}</span>
                    <span className="pill bg-ink-100 text-ink-600">{o.probability}%</span>
                  </div>
                  {o.expectedCloseAt && (
                    <div className="text-[10px] text-ink-400 mt-1.5 inline-flex items-center gap-1">
                      <Icon name="clock" size={10}/>
                      {new Date(o.expectedCloseAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium" })}
                    </div>
                  )}
                  <div className="mt-2 text-[10px] text-brand-700 font-semibold">{locale === "ar" ? "افتح التفاصيل" : "Open details"}</div>
                </div>
              ))}
              {inStage.length === 0 && <div className="text-[11px] text-ink-300 italic px-2 py-6 text-center">—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
