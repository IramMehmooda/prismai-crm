"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/lib/i18n";

type PreferenceState = {
  customerEmails: boolean;
  teamEmails: boolean;
  onlyMyPipeline: boolean;
};

function PreferenceRow({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:border-slate-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink-900">{title}</span>
        <span className="block text-[12px] text-ink-500 mt-0.5">{description}</span>
      </span>
    </label>
  );
}

export default function GmailPanel({
  locale,
  configured,
  connected,
  connectedEmail,
  lastSyncAt,
  pushConfigured,
  pushEnabled,
  watchExpiresAt,
  preferences,
  avatar,
}: {
  locale: Locale;
  configured: boolean;
  connected: boolean;
  connectedEmail: string | null;
  lastSyncAt: string | null;
  pushConfigured: boolean;
  pushEnabled: boolean;
  watchExpiresAt: string | null;
  preferences: PreferenceState;
  avatar: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [customerEmails, setCustomerEmails] = useState(preferences.customerEmails);
  const [teamEmails, setTeamEmails] = useState(preferences.teamEmails);
  const [onlyMyPipeline, setOnlyMyPipeline] = useState(preferences.onlyMyPipeline);

  async function sync() {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/gmail/sync", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setMsg(j.error ?? "Failed");
      return;
    }
    setMsg(locale === "ar"
      ? `استورد ${j.imported} رسالة (${j.matched} مطابقة)`
      : `Imported ${j.imported} emails (${j.matched} matched contacts)`);
    router.refresh();
  }

  async function enableInstantAlerts() {
    setWatchBusy(true);
    setMsg(null);
    const r = await fetch("/api/gmail/watch", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setWatchBusy(false);
    if (!r.ok) {
      setMsg(j.error ?? (locale === "ar" ? "تعذر تفعيل التنبيهات الفورية" : "Could not enable instant alerts"));
      return;
    }
    setMsg(locale === "ar" ? "تم تفعيل تنبيهات البريد الفورية" : "Instant email alerts are enabled");
    router.refresh();
  }

  async function savePreferences() {
    setSavingPrefs(true);
    setMsg(null);
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gmailNotifyCustomerEmails: customerEmails,
        gmailNotifyTeamEmails: teamEmails,
        gmailNotifyOnlyMyPipeline: onlyMyPipeline,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setSavingPrefs(false);
    if (!r.ok) {
      setMsg(j.error ?? (locale === "ar" ? "تعذر حفظ التفضيلات" : "Could not save preferences"));
      return;
    }
    setMsg(locale === "ar" ? "تم حفظ تفضيلات إشعارات البريد" : "Email notification preferences saved");
    router.refresh();
  }

  async function disconnect() {
    if (!confirm(locale === "ar" ? "فصل Gmail؟" : "Disconnect Gmail?")) return;
    setBusy(true);
    await fetch("/api/gmail/disconnect", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  const syncText = lastSyncAt
    ? `${locale === "ar" ? "آخر مزامنة" : "Last synced"} ${new Date(lastSyncAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-SA")}`
    : (locale === "ar" ? "لم تتم المزامنة بعد" : "Not synced yet");

  let watchStatus = locale === "ar" ? "غير مفعلة بعد" : "Not enabled yet";
  if (!pushConfigured) {
    watchStatus = locale === "ar" ? "تحتاج إعداد Google Pub/Sub على الخادم" : "Requires Google Pub/Sub server setup";
  } else if (pushEnabled && watchExpiresAt) {
    watchStatus = `${locale === "ar" ? "صالحة حتى" : "Active until"} ${new Date(watchExpiresAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-SA")}`;
  } else if (pushEnabled) {
    watchStatus = locale === "ar" ? "مفعلة" : "Enabled";
  }

  const connectCopy = locale === "ar"
    ? "اربط Gmail لتسجيل الرسائل كأنشطة وإنشاء تنبيهات فورية للبريد المطابق."
    : "Connect Gmail to log emails as activities and receive instant alerts for matching messages.";

  const footerCopy = locale === "ar"
    ? "تسجيل البريد كنشاط ما زال يعتمد على مزامنة Gmail، لكن التنبيه الفوري يستخدم Gmail Push عند تهيئة Pub/Sub ونشر التطبيق بعنوان عام."
    : "EMAIL activities still sync from Gmail, but instant alerts now use Gmail Push when Pub/Sub is configured on a public deployment.";

  return (
    <div className="card">
      <div className="card-header">
        <span className="flex items-center gap-2"><Icon name="mail" size={16}/> Gmail</span>
        {connected && <span className="pill bg-leaf-100 text-leaf-700">{locale === "ar" ? "متصل" : "Connected"}</span>}
      </div>
      <div className="card-body space-y-4">
        {!configured && (
          <div className="text-[12.5px] bg-amber-50 text-amber-700 border border-amber-200 rounded p-3">
            {locale === "ar"
              ? "تكامل جوجل غير مهيأ. أضف GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET إلى .env ثم أعد تشغيل الخادم."
              : "Google integration is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env and restart the dev server."}
            <div className="text-[11px] mt-2 font-mono opacity-70">Redirect URI: <span className="bg-white px-1.5 py-0.5 rounded">http://localhost:3000/api/auth/google/callback</span></div>
          </div>
        )}

        {configured && !connected && (
          <>
            <p className="text-[13px] text-ink-600">{connectCopy}</p>
            <a href="/api/auth/google/start?mode=connect" className="btn-primary inline-flex">
              <Icon name="mail" size={14}/> {locale === "ar" ? "اربط Gmail" : "Connect Gmail"}
            </a>
          </>
        )}

        {configured && connected && (
          <>
            <div className="flex items-center gap-3">
              {avatar ? <img src={avatar} alt="" className="w-9 h-9 rounded-full"/> : <div className="w-9 h-9 rounded-full bg-grad-brand"/>}
              <div>
                <div className="text-[13px] font-semibold text-ink-900">{connectedEmail}</div>
                <div className="text-[11px] text-ink-400">{syncText}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={sync} disabled={busy} className="btn-primary">
                <Icon name="zap" size={14}/> {busy ? "…" : (locale === "ar" ? "مزامنة الآن" : "Sync now")}
              </button>
              <button onClick={enableInstantAlerts} disabled={watchBusy || !pushConfigured} className="btn-outline">
                <Icon name="bell" size={14}/> {watchBusy ? "…" : (pushEnabled ? (locale === "ar" ? "تجديد التنبيهات الفورية" : "Renew instant alerts") : (locale === "ar" ? "تفعيل التنبيهات الفورية" : "Enable instant alerts"))}
              </button>
              <button onClick={disconnect} disabled={busy} className="btn-outline">
                <Icon name="x" size={14}/> {locale === "ar" ? "فصل" : "Disconnect"}
              </button>
              {msg && <span className="text-[12px] text-ink-600">{msg}</span>}
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 p-3 bg-slate-50">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[12px] font-semibold text-ink-900">{locale === "ar" ? "تنبيهات البريد الفورية" : "Instant email alerts"}</div>
                  <div className="text-[11px] text-ink-500 mt-0.5">{watchStatus}</div>
                </div>
                {pushEnabled && <span className="pill bg-emerald-100 text-emerald-700">{locale === "ar" ? "فوري" : "Instant"}</span>}
              </div>
              <div className="text-[11px] text-ink-500">
                {locale === "ar"
                  ? "عند استلام رسالة مطابقة، يظهر إشعار أعلى التطبيق ويفتح الضغط عليه المحادثة نفسها داخل Gmail."
                  : "Matching inbound emails create top-bar alerts, and clicking the alert opens the exact Gmail thread."}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[12px] font-semibold text-ink-900">{locale === "ar" ? "تفضيلات إشعارات البريد" : "Email notification preferences"}</div>
              <PreferenceRow
                checked={customerEmails}
                onChange={setCustomerEmails}
                title={locale === "ar" ? "رسائل العملاء وجهات الاتصال" : "Customer and contact emails"}
                description={locale === "ar" ? "أنشئ إشعارًا عند ورود بريد من جهة اتصال مرتبطة بعميل محتمل أو عرض سعر أو فرصة." : "Notify when an inbound email is matched to a lead, quote, opportunity, or related contact."}
              />
              <PreferenceRow
                checked={teamEmails}
                onChange={setTeamEmails}
                title={locale === "ar" ? "تضمين رسائل أعضاء الفريق" : "Include team member emails"}
                description={locale === "ar" ? "أنشئ إشعارًا عندما يرسل لك عضو من فريقك بريدًا متعلقًا بالعمل." : "Notify when a teammate emails you about work, even if no customer match is found."}
              />
              <PreferenceRow
                checked={onlyMyPipeline}
                onChange={setOnlyMyPipeline}
                title={locale === "ar" ? "فقط سجلاتي ومساري" : "Only my pipeline and records"}
                description={locale === "ar" ? "اقصر الإشعارات على الفرص وعروض الأسعار والعملاء المحتملين التي أملكها أنا." : "Restrict notifications to the leads, quotes, and opportunities you own."}
              />
              <div className="flex justify-end">
                <button onClick={savePreferences} disabled={savingPrefs} className="btn-primary">
                  <Icon name="check" size={14}/> {savingPrefs ? "…" : (locale === "ar" ? "حفظ التفضيلات" : "Save preferences")}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-ink-400">
              {footerCopy}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
