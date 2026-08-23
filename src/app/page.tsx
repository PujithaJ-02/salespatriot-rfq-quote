// src/app/page.tsx
"use client";

import { useState } from "react";

type QuoteResult = {
  solicitationId: number;
  quoteId: number;
  total: number;
  lineCount: number;
  matchedCount: number;
  reviewCount: number;
  unmatchedCount: number;
};

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

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900">RFQ to Quote</h1>
        <p className="mt-2 text-gray-600">
          Paste a messy RFQ email below. It gets parsed, matched to the parts
          catalog, and priced automatically.
        </p>

        <textarea
          className="mt-6 w-full h-64 rounded-lg border border-gray-300 p-4 font-mono text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
          placeholder="Paste RFQ text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="mt-4 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white disabled:opacity-40"
        >
          {loading ? "Processing..." : "Generate Quote"}
        </button>

        {error && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Quote #{result.quoteId} generated
            </h2>
            <p className="mt-2 text-3xl font-bold text-green-700">
              ${result.total.toLocaleString()}
            </p>
            <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
              <Stat label="Line items" value={result.lineCount} />
              <Stat label="Matched" value={result.matchedCount} />
              <Stat label="Review" value={result.reviewCount} />
              <Stat label="Unmatched" value={result.unmatchedCount} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-3 text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-gray-500">{label}</div>
    </div>
  );
}
