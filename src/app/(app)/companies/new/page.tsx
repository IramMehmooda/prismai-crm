import { getSession } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import CompanyForm from "./CompanyForm";

export const dynamic = "force-dynamic";
export default async function NewCompanyPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">{t(locale, "newCompany")}</h1>
      <CompanyForm locale={locale} />
    </div>
  );
}
