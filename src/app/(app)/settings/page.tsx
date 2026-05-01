import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";
import RecomputeButton from "./RecomputeButton";
import GmailPanel from "./GmailPanel";
import { googleConfigured } from "@/lib/google";
import { gmailPushConfigured } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const isAdmin = session.role === "ADMIN";
  const [rules, leadCount, me] = await Promise.all([
    prisma.scoringRule.findMany({ orderBy: [{ active: "desc" }, { points: "desc" }] }),
    prisma.lead.count(),
    prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        googleId: true,
        googleAccessToken: true,
        gmailLastSyncAt: true,
        gmailWatchExpiration: true,
        gmailPushEnabled: true,
        gmailNotifyCustomerEmails: true,
        gmailNotifyTeamEmails: true,
        gmailNotifyOnlyMyPipeline: true,
        image: true,
        email: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{t(locale, "settings")}</h1>
        <p className="text-sm text-ink-500 mt-1">{locale === "ar" ? "الأدوار، التسعير، قواعد التقييم" : "Roles, pricing, scoring rules"}</p>
      </div>

      {isAdmin && (
        <Link href="/settings/team" className="card card-body flex items-center gap-3 hover:shadow-md transition">
          <span className="w-10 h-10 rounded-lg bg-violet-100 text-violet-700 grid place-items-center"><Icon name="users" size={18}/></span>
          <div className="flex-1">
            <div className="font-semibold text-ink-900">{locale === "ar" ? "الفريق والمستخدمون" : "Team & users"}</div>
            <div className="text-[12px] text-ink-500">{locale === "ar" ? "إضافة أعضاء، إنشاء فرق، إدارة الصلاحيات" : "Add members, create teams, manage access"}</div>
          </div>
          <Icon name="chevron-right" size={16} className="text-ink-400"/>
        </Link>
      )}

      <GmailPanel
        locale={locale}
        configured={googleConfigured()}
        connected={!!me?.googleAccessToken}
        connectedEmail={me?.email ?? null}
        lastSyncAt={me?.gmailLastSyncAt ? me.gmailLastSyncAt.toISOString() : null}
        pushConfigured={gmailPushConfigured()}
        pushEnabled={!!me?.gmailPushEnabled}
        watchExpiresAt={me?.gmailWatchExpiration ? me.gmailWatchExpiration.toISOString() : null}
        preferences={{
          customerEmails: me?.gmailNotifyCustomerEmails ?? true,
          teamEmails: me?.gmailNotifyTeamEmails ?? true,
          onlyMyPipeline: me?.gmailNotifyOnlyMyPipeline ?? true,
        }}
        avatar={me?.image ?? null}
      />

      <div className="card">
        <div className="card-header"><span>{locale === "ar" ? "قواعد تقييم العملاء المحتملين" : "Lead scoring rules"}</span>
          <RecomputeButton locale={locale} leadCount={leadCount}/>
        </div>
        <table className="table-modern">
          <thead>
            <tr>
              <th>{locale === "ar" ? "القاعدة" : "Rule"}</th>
              <th>{locale === "ar" ? "الحقل" : "Field"}</th>
              <th>{locale === "ar" ? "المُشغّل" : "Operator"}</th>
              <th>{locale === "ar" ? "القيمة" : "Value"}</th>
              <th className="text-end">{locale === "ar" ? "الوزن" : "Weight"}</th>
              <th>{locale === "ar" ? "نشط" : "Active"}</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td className="font-medium text-ink-700">{r.name}</td>
                <td className="text-[12px] font-mono text-ink-500">{r.field}</td>
                <td className="text-[12px]">{r.operator}</td>
                <td className="text-[12px] text-ink-500">{r.value}</td>
                <td className="text-end font-semibold tabular-nums">{r.points > 0 ? "+" : ""}{r.points}</td>
                <td><span className={`pill ${r.active ? "bg-leaf-100 text-leaf-700" : "bg-ink-100 text-ink-500"}`}>{r.active ? (locale === "ar" ? "نشط" : "ACTIVE") : "OFF"}</span></td>
              </tr>
            ))}
            {rules.length === 0 && <tr><td colSpan={6} className="text-center text-ink-400 py-8">No rules.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card card-body">
        <div className="font-semibold text-ink-900 mb-3">{locale === "ar" ? "حسابات تجريبية" : "Demo accounts"}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]">
          {[
            ["Faisal Al-Saud", "admin@prismai.app", "ADMIN"],
            ["Khalid Al-Mansour", "manager@prismai.app", "SALES_MANAGER"],
            ["Noura Al-Harbi", "sales@prismai.app", "SALES_REP"],
            ["Omar Al-Dossary", "finance@prismai.app", "FINANCE"],
            ["Sara Al-Otaibi", "marketing@prismai.app", "MARKETING"],
          ].map(([name, email, role]) => (
            <div key={email} className="border border-ink-200 rounded p-3">
              <div className="font-semibold text-ink-700">{name}</div>
              <div className="text-ink-500">{email}</div>
              <div className="text-[11px] mt-1"><span className="pill bg-leaf-100 text-leaf-700">{role}</span></div>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-ink-400 mt-3">{locale === "ar" ? "كلمة المرور لكل الحسابات: " : "Password for all: "}<code className="font-mono bg-ink-100 px-1.5 py-0.5 rounded">Prism@123</code></div>
      </div>
    </div>
  );
}
