// src/lib/quote.ts
import { db } from "../../db/client";
import { supplierPrices } from "../../db/schema";
import { eq } from "drizzle-orm";

export type QuoteLineInput = {
  lineItemId: number;
  partId: number;
  qty: number;
};

export type BuiltQuoteLine = {
  lineItemId: number;
  partId: number;
  supplierId: number;
  qty: number;
  unitCost: number;   // what we pay the supplier
  unitPrice: number;  // what we charge (cost + margin)
  lineTotal: number;  // unitPrice * qty
};

export type BuiltQuote = {
  lines: BuiltQuoteLine[];
  total: number;
  skipped: number[]; // partIds with no supplier price found
};

// Build a priced quote from matched line items.
// marginPct is a percentage, e.g. 15 = 15% markup.
export async function buildQuote(
  items: QuoteLineInput[],
  marginPct = 15
): Promise<BuiltQuote> {
  const lines: BuiltQuoteLine[] = [];
  const skipped: number[] = [];
  const marginMult = 1 + marginPct / 100;

  for (const item of items) {
    // Find all supplier prices for this part, pick the cheapest
    const prices = await db
      .select()
      .from(supplierPrices)
      .where(eq(supplierPrices.partId, item.partId));

    if (prices.length === 0) {
      skipped.push(item.partId);
      continue;
    }

    const cheapest = prices.reduce((min, p) =>
      Number(p.unitCost) < Number(min.unitCost) ? p : min
    );

    const unitCost = Number(cheapest.unitCost);
    const unitPrice = Number((unitCost * marginMult).toFixed(2));
    const lineTotal = Number((unitPrice * item.qty).toFixed(2));

    lines.push({
      lineItemId: item.lineItemId,
      partId: item.partId,
      supplierId: cheapest.supplierId,
      qty: item.qty,
      unitCost,
      unitPrice,
      lineTotal,
    });
  }

  const total = Number(lines.reduce((sum, l) => sum + l.lineTotal, 0).toFixed(2));
  return { lines, total, skipped };
}