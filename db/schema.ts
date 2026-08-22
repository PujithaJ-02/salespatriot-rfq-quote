// db/schema.ts
import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. A solicitation / RFQ that came in (from SAM.gov or a pasted email)
export const solicitations = pgTable("solicitations", {
  id: serial("id").primaryKey(),
  noticeNo: text("notice_no"),
  agency: text("agency"),
  title: text("title").notNull(),
  source: text("source").notNull().default("paste"), // 'samgov' | 'paste' | 'pdf'
  status: text("status").notNull().default("new"),    // new | parsed | quoted
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 3. Master catalog of parts you can supply (seeded synthetically)
export const partsCatalog = pgTable("parts_catalog", {
  id: serial("id").primaryKey(),
  partNo: text("part_no").notNull().unique(),
  name: text("name").notNull(),
  uom: text("uom").notNull().default("EA"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 2. One line pulled out of a solicitation by the LLM
export const lineItems = pgTable("line_items", {
  id: serial("id").primaryKey(),
  solicitationId: integer("solicitation_id")
    .notNull()
    .references(() => solicitations.id),
  partNo: text("part_no"),
  description: text("description"),
  qty: integer("qty").notNull().default(1),
  uom: text("uom").default("EA"),
  matchedPartId: integer("matched_part_id").references(() => partsCatalog.id),
  matchStatus: text("match_status").notNull().default("unmatched"), // matched | unmatched | review
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 4. Suppliers you can buy from
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  leadTimeDays: integer("lead_time_days").notNull().default(30),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 5. Price of a given part from a given supplier (many-to-many bridge)
export const supplierPrices = pgTable("supplier_prices", {
  id: serial("id").primaryKey(),
  partId: integer("part_id")
    .notNull()
    .references(() => partsCatalog.id),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 6. A generated quote for a solicitation
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  solicitationId: integer("solicitation_id")
    .notNull()
    .references(() => solicitations.id),
  marginPct: numeric("margin_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("15.00"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0.00"),
  status: text("status").notNull().default("draft"), // draft | sent
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 7. Individual priced lines inside a quote
export const quoteLines = pgTable("quote_lines", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id")
    .notNull()
    .references(() => quotes.id),
  lineItemId: integer("line_item_id")
    .notNull()
    .references(() => lineItems.id),
  partId: integer("part_id")
    .notNull()
    .references(() => partsCatalog.id),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  qty: integer("qty").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
});

// ---- Relations (lets Drizzle do joins cleanly) ----
export const solicitationsRel = relations(solicitations, ({ many }) => ({
  lineItems: many(lineItems),
  quotes: many(quotes),
}));

export const lineItemsRel = relations(lineItems, ({ one }) => ({
  solicitation: one(solicitations, {
    fields: [lineItems.solicitationId],
    references: [solicitations.id],
  }),
  matchedPart: one(partsCatalog, {
    fields: [lineItems.matchedPartId],
    references: [partsCatalog.id],
  }),
}));

export const supplierPricesRel = relations(supplierPrices, ({ one }) => ({
  part: one(partsCatalog, {
    fields: [supplierPrices.partId],
    references: [partsCatalog.id],
  }),
  supplier: one(suppliers, {
    fields: [supplierPrices.supplierId],
    references: [suppliers.id],
  }),
}));

export const quotesRel = relations(quotes, ({ one, many }) => ({
  solicitation: one(solicitations, {
    fields: [quotes.solicitationId],
    references: [solicitations.id],
  }),
  lines: many(quoteLines),
}));