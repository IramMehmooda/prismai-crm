import { prisma } from "./db";

export type QuoteItemInput = {
  description: string;
  quantity: number;
  unitPriceSar: number;
  discountPct?: number;
  taxRate?: number;
  productId?: string | null;
};

export function calcTotals(items: QuoteItemInput[]) {
  let subtotal = 0;
  let discount = 0;
  let vat = 0;
  for (const it of items) {
    const gross = it.quantity * it.unitPriceSar;
    const disc = gross * ((it.discountPct ?? 0) / 100);
    const taxable = gross - disc;
    const tax = taxable * (it.taxRate ?? 0.15);
    subtotal += gross;
    discount += disc;
    vat += tax;
  }
  const total = subtotal - discount + vat;
  return { subtotal, discount, vat, total };
}

/**
 * Compute the required approval level for a quote based on amount + discount.
 * - > 1,000,000 SAR  ............. FINANCE
 * - > 500,000 SAR or > 10% disc... MANAGER
 * - else ......................... none
 */
export function requiredApprovalLevel(totalSar: number, discountPct: number): "FINANCE" | "MANAGER" | null {
  if (totalSar > 1_000_000) return "FINANCE";
  if (totalSar > 50_000 || discountPct > 10) return "MANAGER";
  return null;
}

export async function nextQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  const last = await prisma.quote.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const n = last ? parseInt(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}
