import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatSAR, type Locale } from "@/lib/i18n";
import AutoPrint from "./AutoPrint";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function QuotePrintPage({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { order: "asc" } }, company: true, contact: true, owner: true },
  });
  if (!quote) notFound();
  const isAr = locale === "ar";
  return (
    <div className="bg-white min-h-screen">
      <AutoPrint />
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 32, color: "#0f1820" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 28, margin: "0 0 4px", color: "#0f1820" }}>Your Company</h1>
            <div style={{ color: "#64748b", fontSize: 12 }}>{isAr ? "صادر عبر prismAI" : "Issued via prismAI"}</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>CR: —  ·  VAT: —</div>
          </div>
          <div style={{ textAlign: isAr ? "left" : "right" }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{isAr ? "عرض سعر" : "QUOTATION"}</div>
            <div style={{ color: "#64748b", fontSize: 12, fontFamily: "ui-monospace" }}>{quote.number} · v{quote.version}</div>
            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: "#ecfdf3", color: "#187a44", fontSize: 11, fontWeight: 600 }}>{quote.status.replace("_", " ")}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, margin: "24px 0" }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 16 }}>
            <div style={{ color: "#64748b", fontSize: 12 }}>{isAr ? "إلى" : "Bill to"}</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{quote.company?.name ?? "—"}</div>
            {quote.buyerNameAr && <div style={{ color: "#64748b", fontSize: 12 }} dir="rtl">{quote.buyerNameAr}</div>}
            {quote.contact && <div style={{ fontSize: 13 }}>{quote.contact.firstName} {quote.contact.lastName}</div>}
            {quote.buyerVat && <div style={{ color: "#64748b", fontSize: 12 }}>VAT: {quote.buyerVat}</div>}
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 16 }}>
            <div style={{ color: "#64748b", fontSize: 12 }}>{isAr ? "تفاصيل" : "Details"}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}><strong>{isAr ? "التاريخ" : "Date"}:</strong> {new Date(quote.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-SA")}</div>
            {quote.validUntil && <div style={{ fontSize: 13 }}><strong>{isAr ? "صالح حتى" : "Valid until"}:</strong> {new Date(quote.validUntil).toLocaleDateString(isAr ? "ar-SA" : "en-SA")}</div>}
            <div style={{ fontSize: 13 }}><strong>{isAr ? "أعد بواسطة" : "Prepared by"}:</strong> {quote.owner?.name ?? "—"}</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr>
              <th style={th(isAr)}>{isAr ? "البند" : "Description"}</th>
              <th style={{ ...th(isAr), textAlign: "end" as any }}>{isAr ? "كمية" : "Qty"}</th>
              <th style={{ ...th(isAr), textAlign: "end" as any }}>{isAr ? "سعر" : "Unit"}</th>
              <th style={{ ...th(isAr), textAlign: "end" as any }}>{isAr ? "خصم" : "Disc"}</th>
              <th style={{ ...th(isAr), textAlign: "end" as any }}>{isAr ? "الإجمالي" : "Total"}</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it) => (
              <tr key={it.id}>
                <td style={td}>{it.description}</td>
                <td style={{ ...td, textAlign: "end" as any }}>{it.quantity}</td>
                <td style={{ ...td, textAlign: "end" as any }}>{formatSAR(it.unitPriceSar, locale)}</td>
                <td style={{ ...td, textAlign: "end" as any }}>{it.discountPct}%</td>
                <td style={{ ...td, textAlign: "end" as any, fontWeight: 600 }}>{formatSAR(it.lineTotal, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 16, maxWidth: 320, marginLeft: isAr ? 0 : "auto", marginRight: isAr ? "auto" : 0 }}>
          <Row label={isAr ? "الإجمالي الفرعي" : "Subtotal"} value={formatSAR(quote.subtotalSar, locale)}/>
          <Row label={isAr ? "الخصم" : "Discount"} value={`- ${formatSAR(quote.discountSar, locale)}`}/>
          <Row label={isAr ? "ضريبة 15%" : "VAT 15%"} value={formatSAR(quote.vatSar, locale)}/>
          <div style={{ borderTop: "2px solid #0f1820", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700, color: "#27ae60" }}>
            <span>{isAr ? "الإجمالي" : "Total"}</span><span>{formatSAR(quote.totalSar, locale)}</span>
          </div>
        </div>

        {quote.notes && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 16, marginTop: 24 }}>
            <div style={{ color: "#64748b", fontSize: 12 }}>{isAr ? "ملاحظات" : "Notes"}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{quote.notes}</div>
          </div>
        )}

        <div style={{ color: "#64748b", fontSize: 12, marginTop: 32, textAlign: "center" }}>
          {isAr ? "شكرًا لتعاملكم معنا · prismAI" : "Thank you for your business · prismAI"}
        </div>

        <div className="no-print" style={{ marginTop: 32, textAlign: "center" }}>
          <PrintButton label={isAr ? "طباعة" : "Print"} />
        </div>
      </div>
    </div>
  );
}

const th = (isAr: boolean) => ({ textAlign: (isAr ? "right" : "left") as any, background: "#f7f9fb", padding: "10px 12px", fontSize: 11, textTransform: "uppercase" as any, color: "#5b6b78", borderBottom: "1px solid #e2e8f0" });
const td = { padding: "10px 12px", borderBottom: "1px solid #eef2f6", fontSize: 13 };

function Row({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}><span style={{ color: "#64748b" }}>{label}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span></div>;
}
