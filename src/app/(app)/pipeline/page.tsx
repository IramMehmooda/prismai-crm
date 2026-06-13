import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getVisibleScope, ownerWhere } from "@/lib/scope";
import { formatSAR, t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";
import OwnerToggle from "@/components/OwnerToggle";
import KanbanBoard from "./KanbanBoard";

export const dynamic = "force-dynamic";

export default async function PipelinePage({ searchParams }: { searchParams?: { owner?: string; stage?: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const mineOnly = searchParams?.owner === "me";
  const focusStageId = searchParams?.stage;
  const scope = await getVisibleScope(session);
  const [stages, opps] = await Promise.all([
    prisma.pipelineStage.findMany({ orderBy: { order: "asc" } }),
    prisma.opportunity.findMany({
      where: ownerWhere(scope, "ownerId", mineOnly, session.sub),
      include: { company: true, contact: true, owner: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const totals = stages.map((s) => ({
    id: s.id,
    sum: opps.filter((o) => o.stageId === s.id).reduce((a, b) => a + b.amount, 0),
    count: opps.filter((o) => o.stageId === s.id).length,
  }));
  const grandTotal = opps.reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{t(locale, "pipeline")}</h1>
          <p className="text-sm text-ink-500 mt-1">
            {opps.length} {t(locale, "opportunities").toLowerCase()} · {formatSAR(grandTotal, locale)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OwnerToggle mineOnly={mineOnly} basePath="/pipeline" locale={locale} />
          <div className="text-[12px] text-ink-500 inline-flex items-center gap-2">
            <Icon name="kanban" size={14}/>
            {locale === "ar" ? "اسحب وأفلت لتغيير المرحلة" : "Drag & drop to change stage"}
          </div>
        </div>
      </div>

      <KanbanBoard
        locale={locale}
        focusStageId={focusStageId}
        stages={stages.map((s) => ({ id: s.id, name: locale === "ar" && s.nameAr ? s.nameAr : s.name, color: s.color, isWon: s.isWon, isLost: s.isLost }))}
        opportunities={opps.map((o) => ({
          id: o.id, title: o.title, amount: o.amount, stageId: o.stageId,
          probability: o.probability,
          company: o.company?.name ?? null,
          contact: o.contact ? `${o.contact.firstName} ${o.contact.lastName}` : null,
          owner: o.owner?.name ?? null,
          expectedCloseAt: o.expectedCloseAt?.toISOString() ?? null,
        }))}
        totals={totals}
      />
    </div>
  );
}
