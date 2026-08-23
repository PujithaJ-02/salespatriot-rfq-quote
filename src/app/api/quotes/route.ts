// src/app/api/quotes/route.ts
import { NextResponse } from "next/server";
import { listQuotes } from "@/lib/pipeline";

export async function GET() {
  try {
    const quotes = await listQuotes();
    return NextResponse.json({ quotes });
  } catch (err) {
    console.error("List quotes failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
