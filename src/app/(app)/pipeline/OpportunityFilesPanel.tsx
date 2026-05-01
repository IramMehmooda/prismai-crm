"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/lib/i18n";

type OpportunityFile = {
  name: string;
  url: string;
  sizeLabel: string;
  uploadedAtLabel: string;
};

export default function OpportunityFilesPanel({
  locale,
  opportunityId,
  files,
}: {
  locale: Locale;
  opportunityId: string;
  files: OpportunityFile[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError(locale === "ar" ? "اختر ملفًا أولاً." : "Choose a file first.");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/opportunities/${opportunityId}/files`, {
      method: "POST",
      body: fd,
    });
    setBusy(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error ?? (locale === "ar" ? "تعذر رفع الملف." : "Failed to upload file."));
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <div className="card">
      <div className="card-header"><span>{locale === "ar" ? "الملفات" : "Files"}</span></div>
      <div className="card-body space-y-4 text-sm text-ink-500">
        <form onSubmit={onSubmit} className="rounded-xl border border-dashed border-ink-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 grid place-items-center shrink-0">
              <Icon name="send" size={16} />
            </div>
            <div>
              <div className="font-semibold text-ink-900">{locale === "ar" ? "رفع ملف من الجهاز" : "Upload file from device"}</div>
              <div className="text-[12px] text-ink-400 mt-1">{locale === "ar" ? "ارفع مخططًا أو PDF أو ملف مواصفات أو أي مستند مرتبط بهذه الصفقة." : "Upload a blueprint, PDF, spec sheet, or any document tied to this deal."}</div>
            </div>
          </div>
          <input name="file" type="file" className="input file:mr-3 file:rounded file:border-0 file:bg-nav-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-nav-600" />
          {error && <div className="text-xs text-accent-red">{error}</div>}
          <button disabled={busy} className="btn-primary w-full">{busy ? "…" : (locale === "ar" ? "رفع الملف" : "Upload file")}</button>
        </form>

        {files.length === 0 ? (
          <div>
            <div>{locale === "ar" ? "لا توجد ملفات مرتبطة بهذه الفرصة بعد." : "No files are attached to this opportunity yet."}</div>
            <div className="text-[12px] text-ink-400 mt-1">{locale === "ar" ? "يمكنك الآن رفع الملفات من جهازك مباشرة إلى هذه الصفقة." : "You can now upload files from your device directly into this deal."}</div>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-4 py-3 hover:border-leaf-400 hover:bg-leaf-50 transition">
                <div className="min-w-0">
                  <div className="font-medium text-ink-900 truncate">{file.name}</div>
                  <div className="text-[12px] text-ink-400">{file.sizeLabel} · {file.uploadedAtLabel}</div>
                </div>
                <span className="text-brand-700 font-medium shrink-0">{locale === "ar" ? "فتح" : "Open"}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}