import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import LeadForm from "./LeadForm";

export default async function NewLeadPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const [companies, contacts] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.contact.findMany({ orderBy: { firstName: "asc" } }),
  ]);
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">{t(locale, "newLead")}</h1>
      <LeadForm companies={companies.map((c) => ({ id: c.id, name: c.name }))}
                contacts={contacts.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))}
                locale={locale} />
    </div>
  );
}
