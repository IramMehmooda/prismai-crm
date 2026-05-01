import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getVisibleScope, ownerWhere } from "@/lib/scope";
import { formatSAR, t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";
import OwnerToggle from "@/components/OwnerToggle";
import LeadsTable from "./LeadsTable";

export default async function LeadsPage({ searchParams }: { searchParams?: { owner?: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const mineOnly = searchParams?.owner === "me";
  const scope = await getVisibleScope(session);
  const [leads, stages] = await Promise.all([
    prisma.lead.findMany({
      where: {
        ...(ownerWhere(scope, "ownerId", mineOnly, session.sub) ?? {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { name: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
    prisma.pipelineStage.findMany({ orderBy: { order: "asc" } }),
  ]);

  const total = leads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t(locale, "leads")}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {leads.length} {locale === "ar" ? "عميل محتمل · قيمة محتملة" : "leads · potential value"}{" "}
            <span className="font-semibold text-slate-700">{formatSAR(total, locale)}</span>
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <OwnerToggle mineOnly={mineOnly} basePath="/leads" locale={locale} />
          <Link href="/leads/new" className="btn-primary"><Icon name="plus" size={16}/> {t(locale, "newLead")}</Link>
        </div>
      </div>

      <LeadsTable
        locale={locale}
        currentUserId={session.sub}
        leads={leads.map((lead) => ({
          id: lead.id,
          title: lead.title,
          source: lead.source,
          status: lead.status,
          score: lead.score,
          estimatedValue: lead.estimatedValue,
          ownerId: lead.ownerId,
          company: lead.company,
          contact: lead.contact,
          owner: lead.owner,
          activities: lead.activities.map((activity) => ({ createdAt: activity.createdAt.toISOString() })),
        }))}
        stages={stages.map((stage) => ({
          id: stage.id,
          name: locale === "ar" && stage.nameAr ? stage.nameAr : stage.name,
          probability: stage.probability,
        }))}
      />
    </div>
  );
}
