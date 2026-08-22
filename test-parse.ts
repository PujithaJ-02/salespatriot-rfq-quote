// test-parse.ts
import "./db/env";
import { readFileSync } from "fs";
import { parseRfq } from "./src/lib/parse";

async function main() {
  const text = readFileSync("data/sample_rfqs/rfq1.txt", "utf-8");
  console.log("Parsing RFQ...\n");

  const result = await parseRfq(text);

  console.log("Title:  ", result.title);
  console.log("Agency: ", result.agency);
  console.log("\nLine items:");
  for (const item of result.lineItems) {
    console.log(`  - [${item.partNo ?? "no part#"}] ${item.description ?? ""} | qty ${item.qty} ${item.uom}`);
  }
}

main().catch((err) => {
  console.error("Parse failed:", err);
  process.exit(1);
});
