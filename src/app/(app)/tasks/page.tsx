import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getVisibleScope, ownerWhere } from "@/lib/scope";
import { t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";
import OwnerToggle from "@/components/OwnerToggle";
import TaskList from "./TaskList";
import NewTaskForm from "./NewTaskForm";

export const dynamic = "force-dynamic";

type TaskView = "my" | "assigned" | "completed";

export default async function TasksPage({ searchParams }: { searchParams?: { owner?: string; view?: TaskView; priority?: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const mineOnly = searchParams?.owner === "me";
  const view = searchParams?.view ?? "my";
  const filterPriority = searchParams?.priority;
  const scope = await getVisibleScope(session);
  const assigneeFilter = ownerWhere(scope, "assigneeId", mineOnly, session.sub);
  const leadOwnerFilter = ownerWhere(scope, "ownerId", mineOnly, session.sub);
  const opportunityOwnerFilter = ownerWhere(scope, "ownerId", mineOnly, session.sub);
  const taskWhere = assigneeFilter
    ? { OR: [assigneeFilter, { creatorId: session.sub }] }
    : undefined;
  const [tasks, users, leads, opps] = await Promise.all([
    prisma.task.findMany({
      where: { ...taskWhere, ...(filterPriority ? { priority: filterPriority } : {}) },
      include: {
        assignee: true,
        creator: true,
        lead: {
          select: { id: true, title: true },
        },
        opportunity: {
          include: {
            contact: { select: { email: true, firstName: true, lastName: true } },
            company: { select: { name: true } },
          },
        },
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
    prisma.lead.findMany({
      where: {
        ...(leadOwnerFilter ?? {}),
        status: { not: "CONVERTED" },
      },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.opportunity.findMany({
      where: {
        ...(opportunityOwnerFilter ?? {}),
        stage: { isWon: false, isLost: false },
      },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const today = todayDateKey();
  const visibleTasks = tasks.filter((task) => {
    if (view === "assigned") return task.creatorId === session.sub;
    if (view === "completed") return task.status === "DONE";
    return task.assigneeId === session.sub && task.status !== "DONE";
  });

  const overdue = visibleTasks.filter((tk) => tk.status === "OPEN" && tk.dueAt && tk.dueAt < today);
  const focus = visibleTasks.filter((tk) => tk.status === "OPEN" && tk.dueAt === today);
  const upcoming = visibleTasks.filter((tk) => tk.status === "OPEN" && tk.dueAt && tk.dueAt > today);
  const noDate = visibleTasks.filter((tk) => tk.status === "OPEN" && !tk.dueAt);
  const done = visibleTasks.filter((tk) => tk.status === "DONE");
  const openCount = visibleTasks.filter((tk) => tk.status === "OPEN").length;
  const viewTabs: { key: TaskView; label: string; count: number }[] = [
    { key: "my", label: locale === "ar" ? "مهامي" : "My Tasks", count: tasks.filter((task) => task.assigneeId === session.sub && task.status !== "DONE").length },
    { key: "assigned", label: locale === "ar" ? "كلفت بها" : "Assigned by Me", count: tasks.filter((task) => task.creatorId === session.sub).length },
    { key: "completed", label: locale === "ar" ? "مكتملة" : "Completed", count: tasks.filter((task) => task.status === "DONE").length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{t(locale, "tasks")}</h1>
          <p className="text-sm text-ink-500 mt-1">
            {openCount} {locale === "ar" ? "مفتوحة" : "open"} · {focus.length} {locale === "ar" ? "مستحقة اليوم" : "due today"} · {overdue.length} {t(locale, "overdue").toLowerCase()}
          </p>
        </div>
        <OwnerToggle mineOnly={mineOnly} basePath="/tasks" locale={locale} />
      </div>

      {/* Filter banner — shown when navigating from analytics chart */}
      {filterPriority && (
        <div className="flex items-center gap-3 rounded-lg border border-leaf-200 bg-leaf-50 px-4 py-2.5 text-sm">
          <span className="text-leaf-700 font-medium">{locale === "ar" ? "تصفية:" : "Filtered by:"}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-leaf-200 px-2.5 py-0.5 text-[12px] font-semibold text-leaf-800">
            Priority = {filterPriority}
          </span>
          <a href="/tasks" className="ml-auto text-[12px] text-leaf-600 hover:text-leaf-800 hover:underline">
            {locale === "ar" ? "× مسح الفلاتر" : "× Clear filter"}
          </a>
        </div>
      )}

      <div className="card p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {viewTabs.map((tab) => {
            const href = `/tasks?${new URLSearchParams({ ...(mineOnly ? { owner: "me" } : {}), view: tab.key }).toString()}`;
            const active = view === tab.key;
            return (
              <a
                key={tab.key}
                href={href}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold border transition ${active ? "bg-nav-700 text-white border-nav-700" : "bg-white text-ink-600 border-ink-200 hover:bg-ink-50"}`}
              >
                {tab.label} <span className="ml-1 opacity-75">{tab.count}</span>
              </a>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-[12px] text-ink-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400"/> {locale === "ar" ? "عالي" : "High"}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"/> {locale === "ar" ? "متوسط" : "Medium"}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400"/> {locale === "ar" ? "منخفض" : "Low"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section
            title={locale === "ar" ? "وضع التركيز" : "Focus Mode"}
            subtitle={locale === "ar" ? "ما يجب تنفيذه اليوم قبل أي شيء آخر." : "What needs attention today before anything else."}
            icon="lightning"
            tone="bg-nav-700"
            tasks={focus}
            locale={locale}
            emptyState={openCount === 0 ? (locale === "ar" ? "أنت منجز كل شيء. لا توجد مهام مفتوحة الآن." : "You're all caught up. No open tasks right now.") : undefined}
          />
          <Section title={t(locale, "overdue")} subtitle={locale === "ar" ? "المهام التي تحتاج إنقاذًا الآن." : "Tasks that need recovery now."} icon="clock" tone="bg-rose-500" tasks={overdue} locale={locale} />
          <Section title={t(locale, "upcoming")} subtitle={locale === "ar" ? "المهام القادمة حتى لا تفاجئك." : "What is coming next so nothing sneaks up on you."} icon="trend-up" tone="bg-sky-500" tasks={upcoming} locale={locale} />
          {noDate.length > 0 && <Section title={locale === "ar" ? "بدون تاريخ" : "No date"} subtitle={locale === "ar" ? "ضع موعدًا قبل أن تضيع المتابعة." : "Add a due date before these drift."} icon="filter" tone="bg-slate-500" tasks={noDate} locale={locale} />}
          {done.length > 0 && <Section title={t(locale, "completed")} subtitle={locale === "ar" ? "الأعمال المنجزة مؤخرًا." : "Recently completed work."} icon="check" tone="bg-leaf-500" tasks={done} locale={locale} />}
        </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <div className="card-header"><span><Icon name="plus" size={14} className="inline mb-0.5"/> {t(locale, "newTask")}</span></div>
            <div className="card-body">
              <NewTaskForm
                locale={locale}
                users={users}
                leads={leads}
                opps={opps}
                defaultAssigneeId={session.sub}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, tone, icon, tasks, locale }: any) {
  if (tasks.length === 0 && !arguments[0].emptyState) return null;
  const { subtitle, emptyState } = arguments[0];
  return (
    <div className="card">
      <div className="card-header">
        <span className="inline-flex items-center gap-2 flex-wrap">
          <span className={`w-6 h-6 rounded-md grid place-items-center text-white ${tone}`}><Icon name={icon} size={12}/></span>
          {title}
          <span className="pill bg-ink-100 text-ink-600">{tasks.length}</span>
        </span>
      </div>
      {subtitle && <div className="px-5 pt-4 text-[12px] text-ink-500">{subtitle}</div>}
      {tasks.length > 0 ? (
        <TaskList tasks={tasks} locale={locale} />
      ) : (
        <div className="card-body text-center py-10">
          <div className="mx-auto w-12 h-12 rounded-full bg-leaf-50 text-leaf-600 grid place-items-center mb-3"><Icon name="sparkles" size={18}/></div>
          <div className="font-semibold text-ink-900">{locale === "ar" ? "أنت منجز كل شيء" : "You're all caught up"}</div>
          <div className="text-sm text-ink-500 mt-1">{emptyState}</div>
        </div>
      )}
    </div>
  );
}

function todayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
