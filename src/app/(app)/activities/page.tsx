import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getVisibleScope, ownerWhere } from "@/lib/scope";
import { t, type Locale } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/Icon";
import OwnerToggle from "@/components/OwnerToggle";
import ActivityForm from "./ActivityForm";

export const dynamic = "force-dynamic";
type TimelineActivity = {
  kind: "activity";
  id: string;
  type: string;
  subject: string;
  body: string | null;
  createdAt: Date;
  actorName: string;
  leadLabel: string | null;
  contactLabel: string | null;
  opportunityLabel: string | null;
};

type TimelineAudit = {
  kind: "audit";
  id: string;
  type: "AUDIT";
  subject: string;
  body: string | null;
  createdAt: Date;
  actorName: string;
  leadLabel: string | null;
  contactLabel: string | null;
  opportunityLabel: string | null;
};

type TimelineItem = TimelineActivity | TimelineAudit;

function auditSubject(action: string, entity: string, label: string) {
  switch (action) {
    case "CREATE": return `${entity} created: ${label}`;
    case "UPDATE": return `${entity} updated: ${label}`;
    case "DELETE": return `${entity} deleted: ${label}`;
    default: return `${entity} ${action.toLowerCase()}: ${label}`;
  }
}

function auditBody(action: string, entity: string) {
  switch (action) {
    case "CREATE": return `Admin audit: ${entity} record created.`;
    case "UPDATE": return `Admin audit: ${entity} record updated.`;
    case "DELETE": return `Admin audit: ${entity} record deleted.`;
    default: return `Admin audit: ${entity} ${action.toLowerCase()}.`;
  }
}

export default async function ActivitiesPage({ searchParams }: { searchParams?: { owner?: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const mineOnly = searchParams?.owner === "me";
  const scope = await getVisibleScope(session);
  const activityWhere = {
    ...(ownerWhere(scope, "userId", mineOnly, session.sub) ?? {}),
    type: { not: "EMAIL" },
    OR: [
      { opportunityId: null },
      { type: "STAGE_CHANGE" },
      { type: "STATUS_CHANGE" },
    ],
  };
  const [activities, leads, contacts, opportunities, auditLogs] = await Promise.all([
    prisma.activity.findMany({
      where: activityWhere,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: true,
        contact: true,
        lead: true,
        opportunity: { select: { id: true, title: true } },
      },
    }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.contact.findMany({ orderBy: { firstName: "asc" }, take: 100 }),
    prisma.opportunity.findMany({
      where: ownerWhere(scope, "ownerId", mineOnly, session.sub),
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, title: true },
    }),
    session.role === "ADMIN"
      ? prisma.auditLog.findMany({
          where: {
            action: { in: ["CREATE", "UPDATE", "DELETE"] },
            entity: { in: ["Lead", "Contact", "Company"] },
          },
          orderBy: { createdAt: "desc" },
          take: 40,
        })
      : Promise.resolve([]),
  ]);

  const auditUserIds = Array.from(new Set(auditLogs.map((log) => log.userId).filter((userId): userId is string => Boolean(userId))));
  const leadIds = Array.from(new Set(auditLogs.filter((log) => log.entity === "Lead").map((log) => log.entityId)));
  const contactIds = Array.from(new Set(auditLogs.filter((log) => log.entity === "Contact").map((log) => log.entityId)));
  const companyIds = Array.from(new Set(auditLogs.filter((log) => log.entity === "Company").map((log) => log.entityId)));

  const [auditUsers, auditLeads, auditContacts, auditCompanies] = await Promise.all([
    auditUserIds.length > 0
      ? prisma.user.findMany({ where: { id: { in: auditUserIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    leadIds.length > 0
      ? prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, title: true } })
      : Promise.resolve([]),
    contactIds.length > 0
      ? prisma.contact.findMany({ where: { id: { in: contactIds } }, select: { id: true, firstName: true, lastName: true } })
      : Promise.resolve([]),
    companyIds.length > 0
      ? prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const auditUserMap = new Map(auditUsers.map((user) => [user.id, user.name]));
  const auditLeadMap = new Map(auditLeads.map((lead) => [lead.id, lead.title]));
  const auditContactMap = new Map(auditContacts.map((contact) => [contact.id, `${contact.firstName} ${contact.lastName}`.trim()]));
  const auditCompanyMap = new Map(auditCompanies.map((company) => [company.id, company.name]));

  const activityItems: TimelineActivity[] = activities.map((activity) => ({
    kind: "activity",
    id: activity.id,
    type: activity.type,
    subject: activity.subject,
    body: activity.body,
    createdAt: activity.createdAt,
    actorName: activity.user?.name ?? "System",
    leadLabel: activity.lead?.title ?? null,
    contactLabel: activity.contact ? `${activity.contact.firstName} ${activity.contact.lastName}` : null,
    opportunityLabel: activity.opportunity?.title ?? null,
  }));

  const auditItems: TimelineAudit[] = auditLogs.map((log) => {
    const label = log.entity === "Lead"
      ? (auditLeadMap.get(log.entityId) ?? log.entityId)
      : log.entity === "Contact"
        ? (auditContactMap.get(log.entityId) ?? log.entityId)
        : (auditCompanyMap.get(log.entityId) ?? log.entityId);
    return {
      kind: "audit",
      id: log.id,
      type: "AUDIT",
      subject: auditSubject(log.action, log.entity, label),
      body: auditBody(log.action, log.entity),
      createdAt: log.createdAt,
      actorName: log.userId ? (auditUserMap.get(log.userId) ?? "Unknown user") : "System",
      leadLabel: log.entity === "Lead" ? label : null,
      contactLabel: log.entity === "Contact" ? label : null,
      opportunityLabel: null,
    };
  });

  const timelineItems: TimelineItem[] = [...activityItems, ...auditItems]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t(locale, "activities")}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {locale === "ar" ? "نشاطات CRM داخل التطبيق، مع تغييرات تقدم الفرص، ويشاهد المسؤول أيضًا سجل CRUD للكائنات المهمة." : "In-app CRM activity with opportunity progress changes, plus important CRUD audit events for admins."}
          </p>
        </div>
        <OwnerToggle mineOnly={mineOnly} basePath="/activities" locale={locale} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-grad-brand text-white grid place-items-center"><Icon name="lightning" size={16}/></span>
              <h2 className="font-semibold text-slate-900">{t(locale, "logActivity")}</h2>
            </div>
            <ActivityForm
              locale={locale}
              leads={leads.map((l) => ({ id: l.id, name: l.title }))}
              contacts={contacts.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))}
              opportunities={opportunities.map((opportunity) => ({ id: opportunity.id, name: opportunity.title }))}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">{locale === "ar" ? "الجدول الزمني" : "Timeline"}</div>
              <span className="pill bg-slate-100 text-slate-600">{timelineItems.length}</span>
            </div>
            <ol className="relative px-6 py-4">
              <span className="absolute start-9 top-4 bottom-4 w-px bg-slate-200"/>
              {timelineItems.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="relative ps-8 py-3.5">
                  <span className={`absolute start-0 top-3.5 w-6 h-6 rounded-full grid place-items-center text-white shadow-soft ${activityColor(item.type)}`}>
                    <Icon name={activityIcon(item.type)} size={12}/>
                  </span>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-semibold text-slate-900">{item.subject}</div>
                    <span className="pill bg-slate-100 text-slate-600">{item.type}</span>
                  </div>
                  {item.body && <div className="text-sm text-slate-600 mt-1">{item.body}</div>}
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
                    <span>{item.actorName}</span>
                    {item.leadLabel && <span>· Lead: <span className="text-slate-700 font-medium">{item.leadLabel}</span></span>}
                    {item.contactLabel && <span>· Contact: <span className="text-slate-700 font-medium">{item.contactLabel}</span></span>}
                    {item.opportunityLabel && <span>· Opportunity: <span className="text-slate-700 font-medium">{item.opportunityLabel}</span></span>}
                    <span>· {new Date(item.createdAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                </li>
              ))}
              {timelineItems.length === 0 && <li className="px-2 py-12 text-center text-slate-500">No activities yet.</li>}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function activityColor(t: string) {
  switch (t) {
    case "AUDIT": return "bg-slate-700";
    case "CALL": return "bg-emerald-500";
    case "EMAIL": return "bg-sky-500";
    case "WHATSAPP": return "bg-green-600";
    case "MEETING": return "bg-violet-500";
    case "STAGE_CHANGE": return "bg-amber-500";
    case "STATUS_CHANGE": return "bg-amber-500";
    default: return "bg-slate-500";
  }
}
function activityIcon(t: string): IconName {
  switch (t) {
    case "AUDIT": return "edit";
    case "CALL": return "phone";
    case "EMAIL": return "mail";
    case "WHATSAPP": return "whatsapp";
    case "MEETING": return "calendar";
    case "STAGE_CHANGE": return "trend-up";
    case "STATUS_CHANGE": return "lightning";
    default: return "activities";
  }
}
