// test-pipeline.ts
import "./db/env";
import { readFileSync } from "fs";
import { processRfq } from "./src/lib/pipeline";

async function main() {
  const text = readFileSync("data/sample_rfqs/rfq1.txt", "utf-8");
  console.log("Processing RFQ and saving to database...\n");

  const result = await processRfq(text, "paste", 15);

  console.log("Saved to database:");
  console.log(`  Solicitation ID: ${result.solicitationId}`);
  console.log(`  Quote ID:        ${result.quoteId}`);
  console.log(`  Total:           $${result.total}`);
  console.log(`  Line items:      ${result.lineCount}`);
  console.log(`    matched:   ${result.matchedCount}`);
  console.log(`    review:    ${result.reviewCount}`);
  console.log(`    unmatched: ${result.unmatchedCount}`);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
