import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatSAR, t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const campaigns = await prisma.campaign.findMany({
    include: { owner: true, _count: { select: { members: true, leads: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{t(locale, "campaigns")}</h1>
          <p className="text-sm text-ink-500 mt-1">{campaigns.length} {locale === "ar" ? "حملة" : "campaigns"}</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary"><Icon name="plus" size={14}/> {locale === "ar" ? "حملة جديدة" : "New campaign"}</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((c) => (
          <div key={c.id} className="card card-body space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-ink-900">{c.name}</div>
                <div className="text-[11px] text-ink-400 mt-0.5">{c.owner?.name ?? "—"}</div>
              </div>
              <span className={`pill ${campaignTone(c.status)}`}>{c.status}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="pill bg-sky-100 text-sky-700">{c.channel}</span>
              {c.budget != null && <span className="pill bg-ink-100 text-ink-600">{formatSAR(c.budget, locale)}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px] pt-2 border-t border-ink-100">
              <div><span className="text-ink-400">{locale === "ar" ? "أعضاء" : "Members"}</span> <span className="font-semibold text-ink-700">{c._count.members}</span></div>
              <div><span className="text-ink-400">{locale === "ar" ? "عملاء محتملون" : "Leads"}</span> <span className="font-semibold text-ink-700">{c._count.leads}</span></div>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && <div className="text-ink-400 text-sm">No campaigns yet.</div>}
      </div>
    </div>
  );
}

function campaignTone(s: string) {
  switch (s) {
    case "DRAFT": return "bg-ink-100 text-ink-600";
    case "ACTIVE": return "bg-leaf-100 text-leaf-700";
    case "PAUSED": return "bg-amber-100 text-amber-700";
    case "COMPLETED": return "bg-sky-100 text-sky-700";
    default: return "bg-ink-100 text-ink-600";
  }
}
