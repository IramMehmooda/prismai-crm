"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";
export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@prismai.app");
  const [password, setPassword] = useState("Prism@123");
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const text = locale === "ar"
    ? { title: "تسجيل الدخول إلى prismAI", sub: "منصة إدارة العلاقات للقطاع الصناعي والتصنيع",
        email: "البريد الإلكتروني", password: "كلمة المرور", signin: "دخول",
        invalid: "البريد الإلكتروني أو كلمة المرور غير صحيحة", switch: "English",
        badge: "منصة CRM للقطاع الصناعي",
        h1: "كل صفقة. كل عرض سعر. في مكان واحد.",
        h2: "خط مبيعات موحّد، عروض أسعار متوافقة مع ضريبة القيمة المضافة، وتكامل مع البريد الإلكتروني — مصمّم لمصنّعي المعدّات الثقيلة.",
        f1Title: "خط مبيعات بصري", f1Body: "كانبان بسبع مراحل، احتمالات مرجّحة، وتنبؤ آني.",
        f2Title: "عروض أسعار بنقرة", f2Body: "كتالوج المنتجات، خصومات، ضريبة 15%، وموافقات تلقائية.",
        f3Title: "متعدّد اللغات", f3Body: "إنجليزي وعربي بالكامل مع طباعة جاهزة لـ ZATCA.",
        google: "المتابعة باستخدام جوجل", or: "أو", demoHint: "تجربة تجريبية" }
    : { title: "Sign in to prismAI", sub: "The intelligent CRM for industrial manufacturers",
        email: "Email", password: "Password", signin: "Sign in",
        invalid: "Invalid email or password", switch: "العربية",
        badge: "Industrial CRM Platform",
        h1: "Every deal. Every quote. One workspace.",
        h2: "A pipeline, product catalogue, VAT-aware quoting, and Gmail-native activity capture — built for the way industrial teams actually sell.",
        f1Title: "Visual pipeline", f1Body: "Seven-stage kanban, weighted probabilities, real-time forecast.",
        f2Title: "Quote builder", f2Body: "Product catalogue, discounts, 15% VAT, threshold-based approvals.",
        f3Title: "Bilingual & RTL", f3Body: "Full English + Arabic UI with ZATCA-ready printable quotes.",
        google: "Continue with Google", or: "or", demoHint: "Demo login" };

  const oauthErr = params.get("error");
  useEffect(() => { if (oauthErr) setError(oauthErr.replace(/_/g, " ")); }, [oauthErr]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, locale }),
    });
    setLoading(false);
    if (!res.ok) { setError(text.invalid); return; }
    router.push("/dashboard"); router.refresh();
  }

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-screen grid lg:grid-cols-2">
      {/* Left hero */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 text-white overflow-hidden bg-grad-aurora">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay"
             style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 70%, white 0, transparent 35%)" }} />
        <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-white/20 blur-3xl animate-float" />
        <div className="absolute -bottom-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-fuchsia-400/30 blur-3xl animate-float" style={{ animationDelay: "2s" }}/>

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur grid place-items-center text-2xl font-black">p</div>
          <div className="text-lg font-semibold tracking-tight">prismAI</div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-medium">
            <Icon name="sparkles" size={14}/> {text.badge}
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">{text.h1}</h1>
          <p className="text-white/85">{text.h2}</p>

          <div className="space-y-3 pt-4">
            {[
              { t: text.f1Title, b: text.f1Body, icon: "trend-up" as const },
              { t: text.f2Title, b: text.f2Body, icon: "lightning" as const },
              { t: text.f3Title, b: text.f3Body, icon: "globe" as const },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/15 grid place-items-center shrink-0">
                  <Icon name={s.icon} size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{s.t}</div>
                  <div className="text-[12px] text-white/75 leading-snug">{s.b}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-white/70">© {new Date().getFullYear()} prismAI · Industrial CRM Platform</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-[var(--bg)] relative">
        <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(rgba(15,23,42,0.05) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative w-full max-w-md animate-fade-in">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-grad-brand text-white grid place-items-center font-black">p</div>
            <span className="font-semibold">prismAI</span>
          </div>

          <div className="mb-6">
            <a
              href="/api/auth/google/start"
              className="w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-3 text-sm font-medium text-slate-700 transition"
            >
              <GoogleG />
              <span>{text.google}</span>
            </a>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200"/>
              <span className="text-[11px] uppercase tracking-wider text-slate-400">{text.or}</span>
              <div className="h-px flex-1 bg-slate-200"/>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{text.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{text.sub}</p>
          </div>

          <form onSubmit={onSubmit} className="card p-6 space-y-4 animate-pop">
            <div>
              <label className="label">{text.email}</label>
              <div className="relative">
                <Icon name="mail" className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input ps-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">{text.password}</label>
              <div className="relative">
                <Icon name="lightning" className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input ps-10" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full h-11 text-base">
              {loading ? "..." : text.signin}
              <Icon name="chevron-right" />
            </button>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setLocale(locale === "ar" ? "en" : "ar")} className="inline-flex items-center gap-1 hover:text-brand-600">
                <Icon name="globe" size={14}/> {text.switch}
              </button>
              <span className="font-mono text-[11px] text-slate-400">{text.demoHint} · Prism@123</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.71a5.4 5.4 0 0 1 0-3.43V4.96H.96a9 9 0 0 0 0 8.07l3-2.32z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}

