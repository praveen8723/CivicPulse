import { Analysis, IssueCategory } from "@/types/civic";
const keywords: Record<IssueCategory, string[]> = {
  Pothole: ["pothole", "pot hole", "crater"],
  "Road Damage": [
    "road damage",
    "damaged road",
    "cracked road",
    "broken pavement",
    "road surface",
  ],
  "Garbage / Waste": [
    "garbage",
    "waste",
    "rubbish",
    "trash",
    "dumping",
    "litter",
  ],
  "Water Leakage": ["water leak", "leaking pipe", "burst pipe", "water pipe"],
  Waterlogging: [
    "waterlogging",
    "water logging",
    "waterlogged",
    "flooded road",
    "street flooding",
    "rainwater flooding",
    "rainwater pooling",
    "standing rainwater",
    "rainwater",
    "standing water",
  ],
  "Drainage / Sewage": ["drain", "sewage", "sewer", "overflow"],
  "Broken Streetlight": ["streetlight", "street light", "lamp", "dark street"],
  "Fallen Tree": ["fallen tree", "tree fell", "branch", "uprooted"],
  "Traffic Signal": ["traffic signal", "traffic light", "signal failure"],
  "Traffic / Congestion": [
    "traffic jam",
    "traffic congestion",
    "traffic bottleneck",
    "gridlock",
    "vehicles backed up",
    "traffic problem",
  ],
  "Public Property Damage": [
    "vandal",
    "bench",
    "bus shelter",
    "public property",
  ],
  Other: [],
};
export function classifyLocally(description: string): Analysis {
  const lower = description.toLowerCase();
  const ranked = Object.entries(keywords)
    .map(([category, words]) => ({
      category: category as IssueCategory,
      hits: words.filter((w) => lower.includes(w)).length,
    }))
    .sort((a, b) => b.hits - a.hits);
  const best = ranked[0];
  const category = best.hits ? best.category : "Other";
  return {
    category,
    confidence: best.hits ? Math.min(0.94, 0.72 + best.hits * 0.07) : 0.35,
    summary: best.hits
      ? `${category} identified from the report description. ${/school|student|hospital|danger|injur|swerv/i.test(description) ? "Public safety indicators need prompt review." : "The assigned team should verify the issue on site."}`
      : "No clear category match. The civic support team should review this report.",
    source: "local",
  };
}
export async function analyzeIssue(description: string): Promise<Analysis> {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
      signal: AbortSignal.timeout(50000),
    });
    if (response.ok) return await response.json();
  } catch {
    /* Reporting remains available when the optional service is offline. */
  }
  return classifyLocally(description);
}
