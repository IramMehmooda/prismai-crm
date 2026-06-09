import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { type Locale } from "@/lib/i18n";
import LeadForm from "../../new/LeadForm";

export const dynamic = "force-dynamic";
export default async function EditLeadPage({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const [lead, companies, contacts] = await Promise.all([
    prisma.lead.findUnique({ where: { id: params.id } }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.contact.findMany({ orderBy: { firstName: "asc" } }),
  ]);
  if (!lead) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">{locale === "ar" ? "تعديل العميل المحتمل" : "Edit lead"}</h1>
      <LeadForm
        companies={companies.map((company) => ({ id: company.id, name: company.name }))}
        contacts={contacts.map((contact) => ({ id: contact.id, name: `${contact.firstName} ${contact.lastName}` }))}
        locale={locale}
        mode="edit"
        endpoint={`/api/leads/${lead.id}`}
        redirectTo={`/leads/${lead.id}`}
        initialData={{
          title: lead.title,
          source: lead.source,
          status: lead.status,
          score: lead.score,
          estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : "",
          notes: lead.notes ?? "",
          companyId: lead.companyId ?? "",
          contactId: lead.contactId ?? "",
        }}
      />
    </div>
  );
}