"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  locale: "en" | "ar";
  initial: {
    name: string;
    localeValue: string;
    image: string;
  };
};

export default function ProfileForm({ locale, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [localeValue, setLocaleValue] = useState(initial.localeValue);
  const [image, setImage] = useState(initial.image);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pwdMsg, setPwdMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const T = (en: string, ar: string) => (locale === "ar" ? ar : en);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          locale: localeValue,
          image: image.trim() ? image.trim() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileMsg({ kind: "err", text: typeof data?.error === "string" ? data.error : T("Could not save profile", "تعذر حفظ الملف الشخصي") });
      } else {
        setProfileMsg({ kind: "ok", text: T("Profile updated", "تم تحديث الملف الشخصي") });
        router.refresh();
      }
    } catch {
      setProfileMsg({ kind: "err", text: T("Network error", "خطأ في الشبكة") });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword.length < 8) {
      setPwdMsg({ kind: "err", text: T("New password must be at least 8 characters", "يجب أن تكون كلمة المرور 8 أحرف على الأقل") });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ kind: "err", text: T("Passwords do not match", "كلمات المرور غير متطابقة") });
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwdMsg({ kind: "err", text: typeof data?.error === "string" ? data.error : T("Could not change password", "تعذر تغيير كلمة المرور") });
      } else {
        setPwdMsg({ kind: "ok", text: T("Password changed", "تم تغيير كلمة المرور") });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPwdMsg({ kind: "err", text: T("Network error", "خطأ في الشبكة") });
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Account details */}
      <form onSubmit={saveProfile} className="card">
        <div className="card-header">
          <span>{T("Account details", "تفاصيل الحساب")}</span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-ink-600 mb-1">{T("Full name", "الاسم الكامل")}</label>
            <input
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-ink-600 mb-1">{T("Language", "اللغة")}</label>
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setLocaleValue("en")}
                className={`px-4 py-2 text-sm ${localeValue === "en" ? "bg-slate-900 text-white" : "bg-white text-ink-700 hover:bg-slate-50"}`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLocaleValue("ar")}
                className={`px-4 py-2 text-sm ${localeValue === "ar" ? "bg-slate-900 text-white" : "bg-white text-ink-700 hover:bg-slate-50"}`}
              >
                العربية
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-ink-600 mb-1">{T("Profile photo URL", "رابط الصورة الشخصية")}</label>
            <input
              className="input w-full"
              type="url"
              placeholder="https://…"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
            <p className="text-[11px] text-ink-500 mt-1">
              {T("Paste a public image URL. Leave blank to use your initials.", "ألصق رابط صورة عامة. اتركه فارغًا لاستخدام الأحرف الأولى.")}
            </p>
          </div>

          {profileMsg && (
            <div className={`text-sm rounded-md px-3 py-2 ${profileMsg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {profileMsg.text}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? T("Saving…", "جارٍ الحفظ…") : T("Save changes", "حفظ التغييرات")}
          </button>
        </div>
      </form>

      {/* Password */}
      <form onSubmit={changePassword} className="card">
        <div className="card-header">
          <span>{T("Change password", "تغيير كلمة المرور")}</span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-ink-600 mb-1">{T("Current password", "كلمة المرور الحالية")}</label>
            <input
              type="password"
              className="input w-full"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-ink-600 mb-1">{T("New password", "كلمة المرور الجديدة")}</label>
              <input
                type="password"
                className="input w-full"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ink-600 mb-1">{T("Confirm new password", "تأكيد كلمة المرور")}</label>
              <input
                type="password"
                className="input w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          {pwdMsg && (
            <div className={`text-sm rounded-md px-3 py-2 ${pwdMsg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {pwdMsg.text}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button type="submit" disabled={savingPwd} className="btn-primary">
            {savingPwd ? T("Updating…", "جارٍ التحديث…") : T("Update password", "تحديث كلمة المرور")}
          </button>
        </div>
      </form>
    </div>
  );
}
