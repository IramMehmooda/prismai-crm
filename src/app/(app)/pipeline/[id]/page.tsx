import { readdir, stat } from "fs/promises";
import { join } from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatSAR, t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";
import TaskList from "@/app/(app)/tasks/TaskList";
import NewTaskForm from "@/app/(app)/tasks/NewTaskForm";
import OpportunityCommentsPanel from "../OpportunityCommentsPanel";
import OpenGmailDraftButton from "../OpenGmailDraftButton";
import OpportunityNoteForm from "../OpportunityNoteForm";
import OpportunityStageActions from "../OpportunityStageActions";
import OpportunityFilesPanel from "../OpportunityFilesPanel";

export const dynamic = "force-dynamic";
function activityIcon(type: string) {
  switch (type) {
    case "EMAIL":
      return "mail" as const;
    case "CALL":
      return "phone" as const;
    case "WHATSAPP":
      return "whatsapp" as const;
    case "MEETING":
      return "calendar" as const;
    case "STATUS_CHANGE":
    case "STAGE_CHANGE":
      return "trend-up" as const;
    default:
      return "edit" as const;
  }
}

function activityTone(type: string) {
  switch (type) {
    case "EMAIL":
      return "bg-sky-100 text-sky-700";
    case "CALL":
      return "bg-emerald-100 text-emerald-700";
    case "WHATSAPP":
      return "bg-green-100 text-green-700";
    case "MEETING":
      return "bg-violet-100 text-violet-700";
    case "STATUS_CHANGE":
    case "STAGE_CHANGE":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: params.id },
    include: {
      stage: true,
      company: { include: { contacts: { orderBy: { createdAt: "desc" }, select: { id: true, firstName: true, lastName: true, title: true, email: true } } } },
      contact: { select: { id: true, firstName: true, lastName: true, title: true, email: true } },
      owner: { select: { id: true, name: true } },
      tasks: { include: { assignee: { select: { name: true } }, opportunity: { select: { id: true, title: true } } }, orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
      quotes: { orderBy: { createdAt: "desc" }, select: { id: true, number: true, totalSar: true, status: true, createdAt: true } },
      activities: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      comments: { include: { user: { select: { id: true, name: true } } }, orderBy: { updatedAt: "desc" } },
    },
  });

  if (!opportunity) notFound();

  const [stages, users, sourceLead] = await Promise.all([
    prisma.pipelineStage.findMany({ orderBy: { order: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true } }),
    opportunity.fromLeadId ? prisma.lead.findUnique({ where: { id: opportunity.fromLeadId }, select: { id: true, source: true, notes: true, title: true } }) : Promise.resolve(null),
  ]);

  const stageIndex = stages.findIndex((stage) => stage.id === opportunity.stageId);
  const wonStage = stages.find((stage) => stage.isWon) ?? null;
  const lostStage = stages.find((stage) => stage.isLost) ?? null;
  const otherContacts = opportunity.company?.contacts.filter((contact) => contact.id !== opportunity.contactId) ?? [];
  const toRecipients = opportunity.contact?.email ? [opportunity.contact.email] : [];
  const ccRecipients = Array.from(new Set(otherContacts.map((contact) => contact.email).filter((email): email is string => Boolean(email))));
  const defaultEmailBody = [
    locale === "ar" ? "مرحبًا،" : "Hello,",
    "",
    locale === "ar"
      ? `أرغب بمتابعة الفرصة: ${opportunity.title}.`
      : `I wanted to follow up regarding the opportunity: ${opportunity.title}.`,
    opportunity.company?.name
      ? (locale === "ar" ? `الشركة: ${opportunity.company.name}` : `Company: ${opportunity.company.name}`)
      : null,
    "",
    locale === "ar" ? "شكرًا،" : "Thanks,",
    session.name,
  ].filter(Boolean).join("\n");
  const filesDir = join(process.cwd(), "public", "uploads", "opportunities", opportunity.id);
  const files = await (async () => {
    try {
      const entries = await readdir(filesDir);
      const withStats = await Promise.all(entries.map(async (entry) => {
        const filePath = join(filesDir, entry);
        const fileStat = await stat(filePath);
        return {
          name: entry.replace(/^\d+-/, ""),
          url: `/uploads/opportunities/${opportunity.id}/${encodeURIComponent(entry)}`,
          sizeLabel: formatBytes(fileStat.size),
          uploadedAtLabel: fileStat.mtime.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium" }),
          mtime: fileStat.mtime.getTime(),
        };
      }));
      return withStats.sort((a, b) => b.mtime - a.mtime);
    } catch {
      return [];
    }
  })();

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Link href="/pipeline" className="crumb">
          <Icon name="chevron-left" size={14} />
          {t(locale, "pipeline")}
        </Link>
      </div>

      <div className="card p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 blur-3xl bg-grad-brand" />
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold">{locale === "ar" ? "الفرصة" : "Opportunity"}</div>
              <h1 className="text-3xl font-bold text-ink-900 mt-1">{opportunity.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="pill bg-brand-50 text-brand-700">{formatSAR(opportunity.amount, locale)}</span>
                <span className="pill bg-slate-100 text-slate-700">{opportunity.probability}% {locale === "ar" ? "احتمال" : "probability"}</span>
                {opportunity.expectedCloseAt && (
                  <span className="pill bg-amber-100 text-amber-700">
                    <Icon name="calendar" size={12} /> {new Date(opportunity.expectedCloseAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium" })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Link href={`/quotes/new?opportunityId=${opportunity.id}`} className="btn-outline">
                <Icon name="quote" size={14} /> {locale === "ar" ? "إنشاء عرض سعر" : "Create quote"}
              </Link>
              <OpenGmailDraftButton
                locale={locale}
                opportunityId={opportunity.id}
                to={toRecipients}
                cc={ccRecipients}
                subject={`${opportunity.title} ${locale === "ar" ? "- تحديث الصفقة" : "- Deal update"}`}
                body={defaultEmailBody}
              />
              <a href="#schedule-task" className="btn-outline">
                <Icon name="tasks" size={14} /> {locale === "ar" ? "جدولة مهمة" : "Schedule task"}
              </a>
              <OpportunityStageActions
                locale={locale}
                opportunityId={opportunity.id}
                wonStageId={wonStage?.id ?? null}
                lostStageId={lostStage?.id ?? null}
                isWon={opportunity.stage.isWon}
                isLost={opportunity.stage.isLost}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "المرحلة الحالية" : "Current stage"}</div>
              <div className="font-semibold text-ink-900">{locale === "ar" && opportunity.stage.nameAr ? opportunity.stage.nameAr : opportunity.stage.name}</div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "إغلاق متوقع" : "Expected close"}</div>
              <div className="font-semibold text-ink-900">{opportunity.expectedCloseAt ? new Date(opportunity.expectedCloseAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium" }) : "—"}</div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "المكلّف" : "Assigned owner"}</div>
              <div className="font-semibold text-ink-900">{opportunity.owner?.name ?? "—"}</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-3">{locale === "ar" ? "مسار المرحلة" : "Stage tracker"}</div>
            <div className="flex items-start gap-2 overflow-x-auto pb-1">
              {stages.map((stage, index) => {
                const done = index <= stageIndex;
                const active = stage.id === opportunity.stageId;
                return (
                  <div key={stage.id} className="min-w-[120px] flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold ${done ? "bg-leaf-500 text-white" : "bg-ink-100 text-ink-500"}`}>{index + 1}</span>
                      {index < stages.length - 1 && <div className={`h-1 flex-1 rounded-full ${index < stageIndex ? "bg-leaf-500" : "bg-ink-100"}`} />}
                    </div>
                    <div className={`mt-2 text-[12px] font-semibold ${active ? "text-ink-900" : "text-ink-500"}`}>{locale === "ar" && stage.nameAr ? stage.nameAr : stage.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header"><span>{locale === "ar" ? "الخط الزمني للنشاط" : "Activity timeline"}</span></div>
            <div className="card-body space-y-4">
              {opportunity.activities.length === 0 && (
                <div className="text-sm text-ink-400">{locale === "ar" ? "لا يوجد نشاط بعد لهذه الفرصة." : "No activity has been recorded for this opportunity yet."}</div>
              )}
              {opportunity.activities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${activityTone(activity.type)}`}>
                    <Icon name={activityIcon(activity.type)} size={14} />
                  </div>
                  <div className="flex-1 min-w-0 border-b border-ink-100 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-ink-900">{activity.subject}</div>
                      <div className="text-[11px] text-ink-400">{new Date(activity.createdAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium", timeStyle: "short" })}</div>
                    </div>
                    <div className="text-[12px] text-ink-400 mt-1">{activity.user.name}</div>
                    {activity.body && <div className="text-sm text-ink-600 mt-2 whitespace-pre-wrap">{activity.body}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header"><span>{locale === "ar" ? "عروض الأسعار المرتبطة" : "Linked quotes"}</span></div>
              <div className="card-body space-y-3">
                {opportunity.quotes.length === 0 && <div className="text-sm text-ink-400">{locale === "ar" ? "لا توجد عروض أسعار مرتبطة بعد." : "No quotes linked to this opportunity yet."}</div>}
                {opportunity.quotes.map((quote) => (
                  <Link key={quote.id} href={`/quotes/${quote.id}`} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3 hover:border-leaf-400 hover:bg-leaf-50 transition">
                    <div>
                      <div className="font-semibold text-brand-700">{quote.number}</div>
                      <div className="text-[12px] text-ink-400">{quote.status} · {new Date(quote.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium" })}</div>
                    </div>
                    <div className="font-semibold text-ink-900">{formatSAR(quote.totalSar, locale)}</div>
                  </Link>
                ))}
              </div>
            </div>

            <OpportunityFilesPanel locale={locale} opportunityId={opportunity.id} files={files} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header"><span>{locale === "ar" ? "السياق الفني" : "Technical context"}</span></div>
              <div className="card-body space-y-3 text-sm">
                {sourceLead ? (
                  <>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "المصدر" : "Converted from lead"}</div>
                      <Link href={`/leads/${sourceLead.id}`} className="text-brand-700 hover:underline font-medium">{sourceLead.title}</Link>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "قناة المصدر" : "Lead source"}</div>
                      <span className="pill bg-slate-100 text-slate-700">{sourceLead.source}</span>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "الملاحظات / المواصفات" : "Notes / specs"}</div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-ink-700 whitespace-pre-wrap min-h-[88px]">{sourceLead.notes?.trim() || (locale === "ar" ? "لا توجد مواصفات مدخلة بعد." : "No technical notes captured yet.")}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-ink-400">{locale === "ar" ? "لا توجد بيانات فنية مرتبطة من عميل محتمل محوّل." : "No technical context is linked from a converted lead yet."}</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span>{locale === "ar" ? "أصحاب المصلحة" : "Stakeholders"}</span></div>
              <div className="card-body space-y-4 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "جهة الاتصال الرئيسية" : "Primary contact"}</div>
                  {opportunity.contact ? (
                    <Link href={`/contacts/${opportunity.contact.id}`} className="text-brand-700 hover:underline font-medium">
                      {opportunity.contact.firstName} {opportunity.contact.lastName}
                    </Link>
                  ) : <span className="text-ink-400">—</span>}
                  {opportunity.contact?.title && <div className="text-ink-500 mt-1">{opportunity.contact.title}</div>}
                  {opportunity.contact?.email && <div className="text-ink-400 mt-1">{opportunity.contact.email}</div>}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2">{locale === "ar" ? "أعضاء لجنة الشراء" : "Buying committee"}</div>
                  {otherContacts.length === 0 && <div className="text-ink-400">{locale === "ar" ? "لا توجد جهات اتصال إضافية مرتبطة بهذه الشركة حتى الآن." : "No additional stakeholders have been linked to this company yet."}</div>}
                  <div className="space-y-2">
                    {otherContacts.map((contact) => (
                      <Link key={contact.id} href={`/contacts/${contact.id}`} className="block rounded-xl border border-ink-100 px-4 py-3 hover:border-leaf-400 hover:bg-leaf-50 transition">
                        <div className="font-medium text-ink-900">{contact.firstName} {contact.lastName}</div>
                        <div className="text-[12px] text-ink-400">{contact.title ?? "—"}{contact.email ? ` · ${contact.email}` : ""}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <div className="card">
            <div className="card-header"><span>{locale === "ar" ? "تفاصيل الصفقة" : "Deal details"}</span></div>
            <div className="card-body space-y-3 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "الشركة" : "Company"}</div>
                {opportunity.company ? <Link href={`/companies/${opportunity.company.id}`} className="text-brand-700 hover:underline">{opportunity.company.name}</Link> : <span className="text-ink-400">—</span>}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "العملة" : "Currency"}</div>
                <span className="text-ink-700">{opportunity.currency}</span>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "تم الإنشاء" : "Created"}</div>
                <span className="text-ink-700">{opportunity.createdAt.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium" })}</span>
              </div>
              {opportunity.closedAt && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "تم الإغلاق" : "Closed"}</div>
                  <span className="text-ink-700">{opportunity.closedAt.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium" })}</span>
                </div>
              )}
              {opportunity.closeReason && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{locale === "ar" ? "سبب الإغلاق / الخسارة" : "Close / loss reason"}</div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-ink-700 whitespace-pre-wrap">{opportunity.closeReason}</div>
                </div>
              )}
            </div>
          </div>

          <div className="card" id="schedule-task">
            <div className="card-header"><span>{locale === "ar" ? "جدولة مهمة متابعة" : "Schedule follow-up task"}</span></div>
            <div className="card-body">
              <NewTaskForm
                locale={locale}
                users={users}
                leads={sourceLead ? [{ id: sourceLead.id, title: sourceLead.title }] : []}
                opps={[{ id: opportunity.id, title: opportunity.title }]}
                defaultAssigneeId={opportunity.owner?.id ?? session.sub}
                defaultOpportunityId={opportunity.id}
              />
            </div>
          </div>

          <OpportunityCommentsPanel
            locale={locale}
            opportunityId={opportunity.id}
            comments={opportunity.comments.map((comment) => ({
              id: comment.id,
              body: comment.body,
              user: comment.user,
              createdAtLabel: comment.createdAt.toLocaleString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium", timeStyle: "short" }),
              updatedAtLabel: comment.updatedAt.toLocaleString(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "medium", timeStyle: "short" }),
              wasEdited: comment.updatedAt.getTime() > comment.createdAt.getTime(),
              canManage: session.role === "ADMIN" || session.role === "SALES_MANAGER" || comment.user.id === session.sub,
            }))}
          />

          <div className="card">
            <div className="card-header"><span>{locale === "ar" ? "إضافة نشاط / ملاحظة" : "Add note / activity"}</span></div>
            <div className="card-body">
              <OpportunityNoteForm locale={locale} opportunityId={opportunity.id} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span>{locale === "ar" ? "المهام المرتبطة" : "Linked tasks"}</span></div>
            <div className="card-body p-0">
              {opportunity.tasks.length === 0 ? (
                <div className="px-5 py-6 text-sm text-ink-400">{locale === "ar" ? "لا توجد مهام مرتبطة بعد." : "No tasks linked to this opportunity yet."}</div>
              ) : (
                <TaskList
                  locale={locale}
                  tasks={opportunity.tasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    priority: task.priority,
                    dueAt: task.dueAt,
                    assignee: task.assignee,
                    opportunity: task.opportunity,
                    creator: null,
                    lead: null,
                  }))}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}