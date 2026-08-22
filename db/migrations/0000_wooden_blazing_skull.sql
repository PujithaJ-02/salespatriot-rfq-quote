CREATE TABLE "line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"solicitation_id" integer NOT NULL,
	"part_no" text,
	"description" text,
	"qty" integer DEFAULT 1 NOT NULL,
	"uom" text DEFAULT 'EA',
	"matched_part_id" integer,
	"match_status" text DEFAULT 'unmatched' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_no" text NOT NULL,
	"name" text NOT NULL,
	"uom" text DEFAULT 'EA' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parts_catalog_part_no_unique" UNIQUE("part_no")
);
--> statement-breakpoint
CREATE TABLE "quote_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"line_item_id" integer NOT NULL,
	"part_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"solicitation_id" integer NOT NULL,
	"margin_pct" numeric(5, 2) DEFAULT '15.00' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"notice_no" text,
	"agency" text,
	"title" text NOT NULL,
	"source" text DEFAULT 'paste' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lead_time_days" integer DEFAULT 30 NOT NULL,
	"rating" numeric(3, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_solicitation_id_solicitations_id_fk" FOREIGN KEY ("solicitation_id") REFERENCES "public"."solicitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_matched_part_id_parts_catalog_id_fk" FOREIGN KEY ("matched_part_id") REFERENCES "public"."parts_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_line_item_id_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."line_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_part_id_parts_catalog_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_solicitation_id_solicitations_id_fk" FOREIGN KEY ("solicitation_id") REFERENCES "public"."solicitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_part_id_parts_catalog_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;