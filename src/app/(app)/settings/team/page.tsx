import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { type Locale } from "@/lib/i18n";
import TeamsPanel from "./TeamsPanel";
import UsersPanel from "./UsersPanel";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [teams, allActiveUsers, users] = await Promise.all([
    prisma.team.findMany({
      include: {
        _count: { select: { members: true } },
        members: {
          select: { id: true, name: true, email: true, role: true, isActive: true, image: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, locale: true, isActive: true,
        image: true, googleId: true, createdAt: true,
        teams: { select: { id: true, name: true } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">
          {locale === "ar" ? "الفريق والمستخدمون" : "Team & users"}
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          {locale === "ar"
            ? "إدارة أعضاء الفريق، الفرق، والصلاحيات"
            : "Manage team members, teams, and access"}
        </p>
      </div>

      <TeamsPanel locale={locale} teams={teams} allUsers={allActiveUsers} />

      <UsersPanel
        locale={locale}
        users={users}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}
