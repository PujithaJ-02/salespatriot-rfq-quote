// src/lib/pipeline.ts
import { db } from "../../db/client";
import {
  solicitations,
  lineItems,
  quotes,
  quoteLines,
} from "../../db/schema";
import { eq } from "drizzle-orm";
import { parseRfq } from "./parse";
import { matchLineItem } from "./match";
import { buildQuote, type QuoteLineInput } from "./quote";

export type PipelineResult = {
  solicitationId: number;
  quoteId: number;
  total: number;
  lineCount: number;
  matchedCount: number;
  reviewCount: number;
  unmatchedCount: number;
};

// Full flow: raw RFQ text -> parsed -> matched -> quoted -> all saved to Postgres
export async function processRfq(
  rawText: string,
  source = "paste",
  marginPct = 15
): Promise<PipelineResult> {
  // 1. Parse
  const parsed = await parseRfq(rawText);

  // 2. Save the solicitation
  const [sol] = await db
    .insert(solicitations)
    .values({
      title: parsed.title,
      agency: parsed.agency,
      source,
      status: "parsed",
    })
    .returning();

  // 3. Save each line item, matching as we go
  const quoteInputs: QuoteLineInput[] = [];
  let matchedCount = 0;
  let reviewCount = 0;
  let unmatchedCount = 0;

  for (const item of parsed.lineItems) {
    const m = await matchLineItem(item);

    if (m.matchStatus === "matched") matchedCount++;
    else if (m.matchStatus === "review") reviewCount++;
    else unmatchedCount++;

    const [savedLine] = await db
      .insert(lineItems)
      .values({
        solicitationId: sol.id,
        partNo: item.partNo,
        description: item.description,
        qty: item.qty,
        uom: item.uom,
        matchedPartId: m.matchedPartId,
        matchStatus: m.matchStatus,
      })
      .returning();

    // Only quote lines we actually matched to a catalog part
    if (m.matchedPartId) {
      quoteInputs.push({
        lineItemId: savedLine.id,
        partId: m.matchedPartId,
        qty: item.qty,
      });
    }
  }

  // 4. Build the quote
  const built = await buildQuote(quoteInputs, marginPct);

  // 5. Save the quote header
  const [quote] = await db
    .insert(quotes)
    .values({
      solicitationId: sol.id,
      marginPct: marginPct.toFixed(2),
      total: built.total.toFixed(2),
      status: "draft",
    })
    .returning();

  // 6. Save the quote lines
  if (built.lines.length > 0) {
    await db.insert(quoteLines).values(
      built.lines.map((l) => ({
        quoteId: quote.id,
        lineItemId: l.lineItemId,
        partId: l.partId,
        supplierId: l.supplierId,
        qty: l.qty,
        unitPrice: l.unitPrice.toFixed(2),
        lineTotal: l.lineTotal.toFixed(2),
      }))
    );
  }

  // 7. Mark solicitation as quoted
  await db
    .update(solicitations)
    .set({ status: "quoted" })
    .where(eq(solicitations.id, sol.id));

  return {
    solicitationId: sol.id,
    quoteId: quote.id,
    total: built.total,
    lineCount: parsed.lineItems.length,
    matchedCount,
    reviewCount,
    unmatchedCount,
  };
}