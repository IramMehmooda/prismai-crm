import Link from "next/link";
import { type Locale } from "@/lib/i18n";

export default function OwnerToggle({
  mineOnly,
  basePath,
  locale,
}: {
  mineOnly: boolean;
  basePath: string;
  locale: Locale;
}) {
  const mineLabel = locale === "ar" ? "خاصة بي" : "Mine";
  const allLabel = locale === "ar" ? "الكل" : "All";
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[12px]">
      <Link
        href={basePath}
        className={`px-2.5 py-1 rounded-md ${!mineOnly ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
      >
        {allLabel}
      </Link>
      <Link
        href={`${basePath}?owner=me`}
        className={`px-2.5 py-1 rounded-md ${mineOnly ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
      >
        {mineLabel}
      </Link>
    </div>
  );
}
