import { IssueCategory, PriorityFactor, Severity } from "@/types/civic";
const base: Record<IssueCategory, number> = {
  Pothole: 35,
  "Road Damage": 30,
  "Garbage / Waste": 16,
  "Water Leakage": 27,
  Waterlogging: 42,
  "Drainage / Sewage": 33,
  "Broken Streetlight": 20,
  "Fallen Tree": 40,
  "Traffic Signal": 50,
  "Traffic / Congestion": 30,
  "Public Property Damage": 12,
  Other: 10,
};
export function calculatePriorityScore(
  input: {
    category: IssueCategory;
    description: string;
    reporterCount?: number;
    communityConfirmations?: number;
    createdAt?: string;
    status?: string;
  },
  now = Date.now(),
) {
  const age = Math.max(
    0,
    (now - new Date(input.createdAt ?? now).getTime()) / 3600000,
  );
  const factors: PriorityFactor[] = [
    { label: "Base issue risk", value: base[input.category] },
    {
      label: "Public safety indicators",
      value:
        /danger|swerv|injur|accident|exposed|blocked|sparking|collision/i.test(
          input.description,
        )
          ? 18
          : 0,
    },
    {
      label: "School, hospital or busy junction",
      value: /school|student|hospital|junction|intersection|highway/i.test(
        input.description,
      )
        ? 12
        : 0,
    },
    {
      label: "Community report volume",
      value: Math.min(
        15,
        Math.max(0, (input.reporterCount ?? 1) - 1) * 2 +
          Math.floor((input.communityConfirmations ?? 0) / 3),
      ),
    },
    {
      label: "Unresolved age",
      value:
        input.status === "Resolved" ? 0 : Math.min(10, Math.floor(age / 24)),
    },
    {
      label: "Response delay over 48 hours",
      value: input.status === "Reported" && age > 48 ? 5 : 0,
    },
  ];
  const score = Math.min(
    100,
    factors.reduce((sum, f) => sum + f.value, 0),
  );
  return { score, severity: severityFromScore(score), factors };
}
export function severityFromScore(score: number): Severity {
  return score >= 80
    ? "Critical"
    : score >= 55
      ? "High"
      : score >= 30
        ? "Medium"
        : "Low";
}
