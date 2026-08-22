// src/lib/llm.ts
import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not set. Add it to .env.local");
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Low temperature = more consistent, less creative. Good for extraction.
export async function callLlm(systemPrompt: string, userContent: string): Promise<string> {
    const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}