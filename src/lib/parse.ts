// src/lib/parse.ts
import { callLlm } from "./llm";
import { parsedRfqSchema, type ParsedRfq } from "./validation";

const SYSTEM_PROMPT = `You are a procurement assistant that extracts structured data from government RFQs (Request for Quote).

Given raw RFQ text, extract:
- title: a short title for the solicitation
- agency: the requesting agency/office, or null if not stated
- lineItems: an array of every part/item requested, each with:
  - partNo: the part number as written, or null if none given
  - description: what the item is, or null
  - qty: quantity as an integer (default 1 if unclear)
  - uom: unit of measure (EA, FT, KT, etc.), default "EA"

Return ONLY valid JSON matching this shape, with no markdown, no code fences, no explanation:
{"title": string, "agency": string|null, "lineItems": [{"partNo": string|null, "description": string|null, "qty": number, "uom": string}]}`;

export async function parseRfq(rawText: string): Promise<ParsedRfq> {
  const raw = await callLlm(SYSTEM_PROMPT, rawText);

  // Strip code fences if the model added them despite instructions
  const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new Error(`LLM did not return valid JSON. Got: ${cleaned.slice(0, 200)}`);
  }

  // Validate against the Zod schema. Throws if the shape is wrong.
  return parsedRfqSchema.parse(json);
}