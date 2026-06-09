import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import ContactForm from "../../new/ContactForm";

export const dynamic = "force-dynamic";
export default async function EditContactPage({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const [contact, companies] = await Promise.all([
    prisma.contact.findUnique({ where: { id: params.id } }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!contact) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">{locale === "ar" ? "تعديل جهة الاتصال" : "Edit contact"}</h1>
      <ContactForm
        companies={companies.map((company) => ({ id: company.id, name: company.name }))}
        locale={locale}
        mode="edit"
        endpoint={`/api/contacts/${contact.id}`}
        redirectTo={`/contacts/${contact.id}`}
        initialData={{
          firstName: contact.firstName,
          lastName: contact.lastName,
          nameAr: contact.nameAr ?? "",
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          whatsapp: contact.whatsapp ?? "",
          title: contact.title ?? "",
          companyId: contact.companyId ?? "",
        }}
      />
    </div>
  );
}