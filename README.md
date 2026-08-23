# RFQ to Quote

A small full-stack app that turns a messy Request for Quote (RFQ) email into a priced quote. You paste in a raw RFQ, it pulls out the line items, matches each one against a parts catalog, picks the cheapest supplier, adds a margin, and shows you a finished quote. Every quote is saved and listed on a dashboard.

I built this because a lot of defense and aerospace suppliers still handle RFQs by hand: someone reads an email, looks up each part, checks supplier prices, and types out a quote. This app does that same job automatically, and keeps the math easy to check.

**Live app:** REPLACE_WITH_YOUR_VERCEL_URL

## What it does

1. You paste an RFQ email (or a solicitation) into a text box.
2. A language model reads the messy text and pulls out each line item: part number, description, quantity, and unit.
3. The app matches each part number to a real row in the parts catalog. If the part number does not match exactly, it falls back to a fuzzy match on the description.
4. For each matched part, it looks up supplier prices and picks the cheapest one.
5. It adds a 15% margin and totals everything into a quote.
6. The quote is saved to the database and shows up on the dashboard with all the other quotes.

## How I kept the numbers honest

One thing I was careful about: the language model only does the reading. It never decides prices.

The model's only job is to turn unstructured email text into structured line items. After that, everything is plain code and database lookups: matching parts, picking the cheapest supplier, applying the margin, and adding up totals. That means every dollar in a quote can be traced back to a specific catalog row and a fixed margin rule. There is no place where the model invents a price.

The catalog prices themselves are synthetic, since there is no public price feed for these parts. So the pricing logic is real, but the underlying numbers are made up for the demo.

## Tech stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (TypeScript)
- **Database:** PostgreSQL (hosted on Neon), with Drizzle ORM
- **Language model:** GPT-OSS 120B, served through Groq
- **Hosting:** Vercel, with automatic deploys from GitHub

## How the pieces fit together

The app is one Next.js project. The frontend, the API routes, and the backend logic all live in the same codebase, which is normal for Next.js.

- The **frontend** (`src/app/page.tsx`) is the paste box and the quote view. `src/app/dashboard/page.tsx` is the list of past quotes.
- The **API routes** (`src/app/api/`) take a request from the frontend and call the backend logic. `/api/ingest` runs the whole pipeline, `/api/quotes` lists saved quotes.
- The **backend logic** lives in `src/lib/`. Each file does one job: `parse.ts` (read the RFQ), `match.ts` (match parts), `quote.ts` (price them), and `pipeline.ts` (run all the steps and save to the database).
- The **database** is defined in `db/schema.ts` as seven tables that link together: solicitations, line items, parts catalog, suppliers, supplier prices, quotes, and quote lines.

## The database

Seven tables, connected with foreign keys:

- `solicitations` — one row per RFQ that comes in
- `line_items` — the parts pulled out of a solicitation
- `parts_catalog` — the master list of parts we can supply
- `suppliers` — who we can buy from
- `supplier_prices` — the price of a part from a supplier (this is the link between parts and suppliers)
- `quotes` — a generated quote for a solicitation
- `quote_lines` — the priced lines inside a quote

When the app builds a quote, it joins these tables so each line shows the part name, the supplier name, the unit price, and the line total.

## Running it locally

You need Node.js 20 or higher, a Neon (or any Postgres) database, and a Groq API key.

1. Clone the repo and install:
   ```bash
   npm install
   ```
2. Make a `.env.local` file with your keys:
   ```
   DATABASE_URL=your_postgres_connection_string
   GROQ_API_KEY=your_groq_key
   ```
3. Create the tables and add sample data:
   ```bash
   npx drizzle-kit migrate
   npx tsx db/seed.ts
   ```
4. Start the app:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000, paste an RFQ, and generate a quote.

## What I learned building this

- How to wire up a full-stack Next.js app end to end, from a Postgres schema all the way to the screen.
- How to use a language model for the part it is actually good at (reading messy text) while keeping anything involving money in plain, testable code.
- How to design a relational schema with foreign keys so the data stays consistent and the joins are clean.
- How to deploy to Vercel with environment variables, so the same database works for both local development and the live site.
- Some real debugging: a deprecated model ID, a load-order bug with environment variables, and a paste that corrupted a file. Working through those was most of the learning.

## Honest limits

- The parts catalog and supplier prices are synthetic. The pricing logic is real, the numbers are not.
- The margin is a flat 15%. A real system would vary it by part, supplier, or customer.
- There is no login. Anyone with the link can generate a quote. That is fine for a demo, not for production.
