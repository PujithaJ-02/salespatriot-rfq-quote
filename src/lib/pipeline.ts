// src/lib/pipeline.ts
import { db } from "../../db/client";
import {
  solicitations,
  lineItems,
  quotes,
  quoteLines,
  partsCatalog,
  suppliers,
} from "../../db/schema";
import { eq, desc } from "drizzle-orm";
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

  // Guard: if nothing got matched/priced, don't create a junk $0 quote
  if (built.lines.length === 0) {
    await db
      .update(solicitations)
      .set({ status: "no_match" })
      .where(eq(solicitations.id, sol.id));
    throw new Error(
      "No line items could be matched to the catalog. No quote was created."
    );
  }

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

// Fetch a full quote with all its lines joined to part + supplier names
export async function getQuoteDetail(quoteId: number) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId));

  if (!quote) return null;

  const [sol] = await db
    .select()
    .from(solicitations)
    .where(eq(solicitations.id, quote.solicitationId));

  // Join quote lines to part names and supplier names
  const lines = await db
    .select({
      id: quoteLines.id,
      qty: quoteLines.qty,
      unitPrice: quoteLines.unitPrice,
      lineTotal: quoteLines.lineTotal,
      partNo: partsCatalog.partNo,
      partName: partsCatalog.name,
      supplierName: suppliers.name,
    })
    .from(quoteLines)
    .innerJoin(partsCatalog, eq(quoteLines.partId, partsCatalog.id))
    .innerJoin(suppliers, eq(quoteLines.supplierId, suppliers.id))
    .where(eq(quoteLines.quoteId, quoteId));

  return {
    quoteId: quote.id,
    title: sol?.title ?? "Untitled",
    agency: sol?.agency ?? null,
    marginPct: Number(quote.marginPct),
    total: Number(quote.total),
    lines: lines.map((l) => ({
      ...l,
      unitPrice: Number(l.unitPrice),
      lineTotal: Number(l.lineTotal),
    })),
  };
}

// List all quotes with their solicitation info, newest first
export async function listQuotes() {
  const rows = await db
    .select({
      quoteId: quotes.id,
      total: quotes.total,
      status: quotes.status,
      createdAt: quotes.createdAt,
      title: solicitations.title,
      agency: solicitations.agency,
    })
    .from(quotes)
    .innerJoin(solicitations, eq(quotes.solicitationId, solicitations.id))
    .orderBy(desc(quotes.id));

  return rows.map((r) => ({
    ...r,
    total: Number(r.total),
  }));
}