import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatSAR, t, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{t(locale, "products")}</h1>
          <p className="text-sm text-ink-500 mt-1">{products.length} {locale === "ar" ? "منتج" : "products"}</p>
        </div>
        <Link href="/products/new" className="btn-primary"><Icon name="plus" size={14}/> {locale === "ar" ? "منتج جديد" : "New product"}</Link>
      </div>

      <div className="card overflow-hidden">
        <table className="table-modern">
          <thead>
            <tr>
              <th>{t(locale, "sku")}</th>
              <th>{t(locale, "name")}</th>
              <th>{locale === "ar" ? "الفئة" : "Category"}</th>
              <th className="text-end">{t(locale, "unitPrice")}</th>
              <th className="text-end">{t(locale, "taxRate")}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-[12px] text-ink-500">{p.sku}</td>
                <td>
                  <div className="font-semibold text-ink-900">{locale === "ar" && p.nameAr ? p.nameAr : p.name}</div>
                  {p.description && <div className="text-[11px] text-ink-400 truncate max-w-md">{p.description}</div>}
                </td>
                <td><span className="pill bg-ink-100 text-ink-600">{p.category ?? "—"}</span></td>
                <td className="text-end font-semibold tabular-nums">{formatSAR(p.unitPriceSar, locale)}</td>
                <td className="text-end tabular-nums">{Math.round(p.taxRate * 100)}%</td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={5} className="text-center text-ink-400 py-12">No products.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
