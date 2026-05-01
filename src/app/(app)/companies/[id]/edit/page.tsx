import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import CompanyForm from "../../new/CompanyForm";

export default async function EditCompanyPage({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const company = await prisma.company.findUnique({ where: { id: params.id } });
  if (!company) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">{locale === "ar" ? "تعديل الشركة" : "Edit company"}</h1>
      <CompanyForm
        locale={locale}
        mode="edit"
        endpoint={`/api/companies/${company.id}`}
        redirectTo={`/companies/${company.id}`}
        initialData={{
          name: company.name,
          nameAr: company.nameAr ?? "",
          industry: company.industry ?? "",
          region: company.region ?? "Riyadh",
          website: company.website ?? "",
          vatNumber: company.vatNumber ?? "",
          size: company.size ?? "MID",
        }}
      />
    </div>
  );
}