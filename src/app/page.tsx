// src/app/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

type QuoteLine = {
  id: number;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  partNo: string;
  partName: string;
  supplierName: string;
};

type QuoteDetail = {
  quoteId: number;
  title: string;
  agency: string | null;
  marginPct: number;
  total: number;
  lines: QuoteLine[];
};

type QuoteResult = {
  quoteId: number;
  lineCount: number;
  matchedCount: number;
  reviewCount: number;
  unmatchedCount: number;
  detail: QuoteDetail | null;
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, marginPct: 15 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const detail = result?.detail;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">RFQ to Quote</h1>
            <p className="text-sm text-slate-500">
              Parse a solicitation, match it to your catalog, and price it.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              RFQ text
            </label>
            <textarea
              className="h-96 w-full rounded-xl border border-slate-300 bg-white p-4 font-mono text-sm leading-relaxed shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              placeholder="Paste a messy RFQ email here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
              className="mt-4 w-full rounded-xl bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Processing..." : "Generate Quote"}
            </button>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </section>

          <section>
            {!result && (
              <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
                Your generated quote will appear here.
              </div>
            )}

            {result && detail && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-semibold">{detail.title}</h2>
                      <p className="text-sm text-slate-500">
                        {detail.agency ?? "Unknown agency"} &middot; Quote #{detail.quoteId}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      {result.matchedCount} matched
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-3 font-medium">Part</th>
                        <th className="px-3 py-3 font-medium">Supplier</th>
                        <th className="px-3 py-3 text-right font-medium">Qty</th>
                        <th className="px-3 py-3 text-right font-medium">Unit</th>
                        <th className="px-6 py-3 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.lines.map((l) => (
                        <tr key={l.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-6 py-3">
                            <div className="font-medium text-slate-900">{l.partNo}</div>
                            <div className="text-xs text-slate-500">{l.partName}</div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{l.supplierName}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{l.qty.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{money(l.unitPrice)}</td>
                          <td className="px-6 py-3 text-right font-medium tabular-nums">{money(l.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <span className="text-sm text-slate-500">Incl. {detail.marginPct}% margin</span>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Quote total</div>
                    <div className="text-2xl font-bold tabular-nums text-slate-900">{money(detail.total)}</div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
