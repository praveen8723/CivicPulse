import { NextResponse } from "next/server";
import { classifyLocally } from "@/services/issueClassifier";
import { categories } from "@/types/civic";
function validAnalysis(value: unknown): value is { category: (typeof categories)[number]; confidence: number; summary: string } {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return typeof result.category === "string" &&
    categories.some((category) => category === result.category) &&
    typeof result.confidence === "number" && result.confidence >= 0 && result.confidence <= 1 &&
    typeof result.summary === "string" && result.summary.length > 0 && result.summary.length <= 500;
}
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    typeof body?.description !== "string" ||
    body.description.length < 12 ||
    body.description.length > 3000
  )
    return NextResponse.json(
      { error: "Description must be 12–3000 characters." },
      { status: 400 },
    );
  // Ollama runs on the same machine as the Next.js server; the browser never calls it directly.
  try {
    const base = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
    const url = new URL("/api/generate", base);
    if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) throw new Error("Ollama must be local");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "llama3.2:latest",
        stream: false,
        format: "json",
        options: { temperature: 0, num_predict: 160 },
        prompt: `Classify this Bengaluru civic report. Return ONLY a JSON object with keys category, confidence, summary. category must be exactly one of: ${categories.join(", ")}. Confidence is 0 to 1. Summary is one plain sentence under 160 characters and must not invent facts. Distinguish rainwater collecting on roads (Waterlogging) from pipe leaks (Water Leakage) and sewage/drain problems (Drainage / Sewage). Report: ${JSON.stringify(body.description)}`,
      }),
      signal: AbortSignal.timeout(42000),
    });
    if (response.ok) {
      const payload = await response.json();
      const result = JSON.parse(payload.response);
      if (validAnalysis(result)) return NextResponse.json({ ...result, source: "ollama" });
    }
  } catch {
    // A stopped, slow, or invalid local model must not block reporting.
  }
  if (process.env.ISSUE_ANALYSIS_URL && process.env.ISSUE_ANALYSIS_KEY) {
    try {
      const response = await fetch(process.env.ISSUE_ANALYSIS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ISSUE_ANALYSIS_KEY}`,
        },
        body: JSON.stringify({ description: body.description }),
        signal: AbortSignal.timeout(6000),
      });
      const result = await response.json();
      if (response.ok && validAnalysis(result))
        return NextResponse.json({ ...result, source: "provider" });
    } catch {
      /* The local model keeps the demo independent of provider availability. */
    }
  }
  return NextResponse.json(classifyLocally(body.description));
}
