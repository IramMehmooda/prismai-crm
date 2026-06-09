import { getSession } from "@/lib/auth";
import { type Locale } from "@/lib/i18n";
import ProductForm from "./ProductForm";

export const dynamic = "force-dynamic";
export default async function NewProductPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-ink-900 mb-4">{locale === "ar" ? "منتج جديد" : "New product"}</h1>
      <div className="card card-body"><ProductForm locale={locale}/></div>
    </div>
  );
}
