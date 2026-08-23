// src/app/api/ingest/route.ts
import { NextResponse } from "next/server";
import { processRfq } from "@/lib/pipeline";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text: string = body.text ?? "";
    const marginPct: number = body.marginPct ?? 15;

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No RFQ text provided" },
        { status: 400 }
      );
    }

    const result = await processRfq(text, "paste", marginPct);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Ingest failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
