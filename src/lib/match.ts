// src/lib/match.ts
import { db } from "../../db/client";
import { partsCatalog } from "../../db/schema";
import { stringSimilarity } from "string-similarity-js";
import type { ParsedLineItem } from "./validation";

export type MatchResult = {
  matchedPartId: number | null;
  matchStatus: "matched" | "review" | "unmatched";
  score: number; // 0 to 1, how confident the match is
};

// Normalize a part number for comparison: strip spaces, dashes, slashes, uppercase
function normalize(s: string): string {
  return s.toUpperCase().replace(/[\s\-/]/g, "");
}

export async function matchLineItem(item: ParsedLineItem): Promise<MatchResult> {
  const parts = await db.select().from(partsCatalog);

  // 1. Exact part-number match (after normalizing)
  if (item.partNo) {
    const target = normalize(item.partNo);
    const exact = parts.find((p) => normalize(p.partNo) === target);
    if (exact) {
      return { matchedPartId: exact.id, matchStatus: "matched", score: 1 };
    }
  }

  // 2. Fuzzy match on description against catalog part names
  if (item.description) {
    let best = { id: null as number | null, score: 0 };
    for (const p of parts) {
      const score = stringSimilarity(item.description, p.name);
      if (score > best.score) best = { id: p.id, score };
    }

    // High confidence -> auto-match. Medium -> flag for human review.
    if (best.score >= 0.6) {
      return { matchedPartId: best.id, matchStatus: "matched", score: best.score };
    }
    if (best.score >= 0.35) {
      return { matchedPartId: best.id, matchStatus: "review", score: best.score };
    }
  }

  // 3. Nothing close enough
  return { matchedPartId: null, matchStatus: "unmatched", score: 0 };
}