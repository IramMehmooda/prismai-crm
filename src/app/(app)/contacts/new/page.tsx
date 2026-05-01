import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import ContactForm from "./ContactForm";

export default async function NewContactPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">{t(locale, "newContact")}</h1>
      <ContactForm companies={companies.map((c) => ({ id: c.id, name: c.name }))} locale={locale} />
    </div>
  );
}
