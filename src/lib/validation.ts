// src/lib/validation.ts
import { z } from "zod";

// One line item the LLM extracts from an RFQ
export const lineItemSchema = z.object({
  partNo: z.string().nullable(),        // as written in the RFQ, may be missing
  description: z.string().nullable(),
  qty: z.number().int().positive().default(1),
  uom: z.string().default("EA"),        // unit of measure
});

// The full parsed result: solicitation info + its line items
export const parsedRfqSchema = z.object({
  title: z.string(),
  agency: z.string().nullable(),
  lineItems: z.array(lineItemSchema),
});

// TypeScript types derived from the schemas (single source of truth)
export type ParsedLineItem = z.infer<typeof lineItemSchema>;
export type ParsedRfq = z.infer<typeof parsedRfqSchema>;