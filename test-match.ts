// test-match.ts
import "./db/env";
import { readFileSync } from "fs";
import { parseRfq } from "./src/lib/parse";
import { matchLineItem } from "./src/lib/match";

async function main() {
  const text = readFileSync("data/sample_rfqs/rfq1.txt", "utf-8");
  console.log("Parsing + matching...\n");

  const parsed = await parseRfq(text);

  for (const item of parsed.lineItems) {
    const m = await matchLineItem(item);
    const label = item.partNo ?? item.description ?? "?";
    console.log(
      `[${label}] -> ${m.matchStatus.toUpperCase()} ` +
      `(partId ${m.matchedPartId ?? "none"}, score ${m.score.toFixed(2)})`
    );
  }
}

main().catch((err) => {
  console.error("Match failed:", err);
  process.exit(1);
});
