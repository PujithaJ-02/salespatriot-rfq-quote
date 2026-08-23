// test-quote.ts
import "./db/env";
import { readFileSync } from "fs";
import { parseRfq } from "./src/lib/parse";
import { matchLineItem } from "./src/lib/match";
import { buildQuote, type QuoteLineInput } from "./src/lib/quote";

async function main() {
  const text = readFileSync("data/sample_rfqs/rfq1.txt", "utf-8");
  console.log("Running full chain: parse -> match -> quote\n");

  // 1. Parse
  const parsed = await parseRfq(text);

  // 2. Match each line item (fake lineItemId with index since we're not saving to DB here)
  const toQuote: QuoteLineInput[] = [];
  let idx = 0;
  for (const item of parsed.lineItems) {
    idx++;
    const m = await matchLineItem(item);
    if (m.matchedPartId) {
      toQuote.push({ lineItemId: idx, partId: m.matchedPartId, qty: item.qty });
    } else {
      console.log(`  (skipped unmatched: ${item.partNo ?? item.description})`);
    }
  }

  // 3. Build the quote
  const quote = await buildQuote(toQuote, 15);

  console.log("\nQUOTE");
  console.log("-----");
  for (const line of quote.lines) {
    console.log(
      `part ${line.partId} | qty ${line.qty} | cost $${line.unitCost} ` +
      `-> price $${line.unitPrice} | line $${line.lineTotal} (supplier ${line.supplierId})`
    );
  }
  console.log("-----");
  console.log(`TOTAL: $${quote.total}  (margin 15%)`);
  if (quote.skipped.length) console.log(`No price for parts: ${quote.skipped.join(", ")}`);
}

main().catch((err) => {
  console.error("Quote failed:", err);
  process.exit(1);
});
