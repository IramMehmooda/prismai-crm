import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";
import ContactsTable from "./ContactsTable";

export const dynamic = "force-dynamic";
export default async function ContactsPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: { select: { name: true } }, owner: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t(locale, "contacts")}</h1>
          <p className="text-sm text-slate-500 mt-1">{contacts.length} {locale === "ar" ? "جهة اتصال" : "people in your network"}</p>
        </div>
        <Link href="/contacts/new" className="btn-primary"><Icon name="plus" size={16}/> {t(locale, "newContact")}</Link>
      </div>

      <ContactsTable contacts={contacts} locale={locale} />
    </div>
  );
}
