import { CivicState, Issue, IssueCategory, IssueStatus } from "@/types/civic";
import { calculatePriorityScore } from "./priority";
import { routing } from "./departmentRouting";
export const locations = [
  {
    address: "Koramangala 5th Block",
    latitude: 12.9346,
    longitude: 77.6181,
    ward: "68",
  },
  {
    address: "Indiranagar, 100 Feet Road",
    latitude: 12.9784,
    longitude: 77.6408,
    ward: "80",
  },
  {
    address: "HSR Layout, Sector 2",
    latitude: 12.9116,
    longitude: 77.6389,
    ward: "174",
  },
  {
    address: "Jayanagar 4th Block",
    latitude: 12.925,
    longitude: 77.5838,
    ward: "153",
  },
  {
    address: "BTM Layout, 2nd Stage",
    latitude: 12.9166,
    longitude: 77.6101,
    ward: "176",
  },
  {
    address: "MG Road, Trinity Circle",
    latitude: 12.9732,
    longitude: 77.6194,
    ward: "111",
  },
  {
    address: "Whitefield Main Road",
    latitude: 12.9698,
    longitude: 77.75,
    ward: "84",
  },
  {
    address: "Electronic City, Phase 1",
    latitude: 12.8452,
    longitude: 77.6602,
    ward: "192",
  },
  {
    address: "JP Nagar, 6th Phase",
    latitude: 12.9063,
    longitude: 77.5857,
    ward: "187",
  },
  {
    address: "Malleshwaram, 8th Cross",
    latitude: 13.0027,
    longitude: 77.5706,
    ward: "45",
  },
  {
    address: "Bellandur, Lake Road",
    latitude: 12.9304,
    longitude: 77.6784,
    ward: "150",
  },
  {
    address: "Silk Board Junction",
    latitude: 12.9177,
    longitude: 77.6238,
    ward: "175",
  },
];
const scenarios: {
  category: IssueCategory;
  title: string;
  description: string;
}[] = [
  {
    category: "Pothole",
    title: "Large pothole near school entrance",
    description:
      "Large pothole outside the school. Cars are swerving and it is dangerous for students.",
  },
  {
    category: "Garbage / Waste",
    title: "Waste collection overdue",
    description:
      "Garbage bags and household waste are piling up beside the market.",
  },
  {
    category: "Water Leakage",
    title: "Water pipe leaking onto footpath",
    description:
      "A leaking pipe is wasting water continuously near the bus stop.",
  },
  {
    category: "Broken Streetlight",
    title: "Streetlights out along walking route",
    description:
      "Three streetlights are not working. The dark street is dangerous for pedestrians.",
  },
  {
    category: "Drainage / Sewage",
    title: "Drain overflow after rainfall",
    description:
      "Drain overflow is causing sewage to spill onto the road near the hospital.",
  },
  {
    category: "Traffic Signal",
    title: "Traffic signal failure at junction",
    description:
      "Traffic signal failure at a busy junction. Dangerous near-collision reported.",
  },
  {
    category: "Road Damage",
    title: "Damaged road surface on bus route",
    description: "The road surface is cracked and damaged across the bus lane.",
  },
  {
    category: "Fallen Tree",
    title: "Fallen tree blocking access",
    description:
      "A fallen tree has blocked the road and ambulance access to the hospital.",
  },
  {
    category: "Public Property Damage",
    title: "Broken seating at bus shelter",
    description: "The bus shelter bench is damaged and needs replacement.",
  },
  {
    category: "Other",
    title: "Street name sign missing",
    description: "Wayfinding sign missing at the end of the residential lane.",
  },
  {
    category: "Waterlogging",
    title: "Rainwater collecting across the road",
    description:
      "Rainwater is pooling across the road after heavy rain and blocking pedestrians.",
  },
  {
    category: "Traffic / Congestion",
    title: "Traffic bottleneck blocking the junction",
    description:
      "A traffic bottleneck is backing up vehicles and blocking the junction during peak hours.",
  },
];
export function createDemoState(now = Date.now()): CivicState {
  const resolvedExamples: Record<
    number,
    { authority: string; citizen: string; note: string; citizenNote: string }
  > = {
    1: {
      authority: "/demo-resolutions/garbage-authority.webp",
      citizen: "/demo-resolutions/garbage-citizen.webp",
      note: "Demo: waste was collected and the market-side footpath was cleared.",
      citizenNote: "Demo: the pavement is clear of rubbish.",
    },
    6: {
      authority: "/demo-resolutions/pothole-authority.webp",
      citizen: "/demo-resolutions/pothole-citizen.webp",
      note: "Demo: the pothole was patched and the road surface levelled.",
      citizenNote: "Demo: the repaired road is safe to use.",
    },
  };
  const categoryMix = [
    0, 1, 2, 3, 4, 5, 0, 1, 2, 6, 10, 7, 1, 3, 4, 0, 2, 8, 10, 11,
  ];
  const issues: Issue[] = Array.from({ length: 48 }, (_, i) => {
    const s = scenarios[categoryMix[i % categoryMix.length]],
      place = locations[i % locations.length],
      age = i === 0 ? 36 : 4 + ((i * 17) % 340);
    const status: IssueStatus = resolvedExamples[i]
      ? "Resolved"
      : i === 0
        ? "Assigned"
        : i % 4 === 0 || i % 11 === 0
          ? "In Progress"
          : i % 3 === 0
            ? "In Progress"
            : i % 3 === 1
              ? "Assigned"
              : "Reported";
    const createdAt = new Date(now - age * 3600000).toISOString(),
      updatedAt = new Date(
        now -
          Math.max(0, age - Math.min(age - 1, 6 + ((i * 13) % 55))) * 3600000,
      ).toISOString();
    const reporterCount = i === 0 ? 6 : 1 + ((i * 7) % 19),
      communityConfirmations = i === 0 ? 3 : (i * 11) % 28;
    const priority = calculatePriorityScore(
      { ...s, createdAt, reporterCount, communityConfirmations, status },
      now,
    );
    return {
      id:
        i === 0
          ? "CP-2026-0892"
          : `CP-2026-${String(930 + i).padStart(4, "0")}`,
      ...s,
      ...place,
      latitude: place.latitude + (i === 0 ? 0 : ((i % 4) - 1.5) * 0.0017),
      longitude: place.longitude + (i === 0 ? 0 : ((i % 3) - 1) * 0.0021),
      status,
      ...(resolvedExamples[i]
        ? {
            resolvedAt: updatedAt,
            resolutionImageUrl: resolvedExamples[i].authority,
            citizenResolutionImageUrl: resolvedExamples[i].citizen,
            resolutionNote: resolvedExamples[i].note,
            citizenResolutionNote: resolvedExamples[i].citizenNote,
            demoResolutionEvidence: true,
          }
        : {}),
      department: routing[s.category],
      createdAt,
      updatedAt,
      priorityScore: priority.score,
      severity: priority.severity,
      factors: priority.factors,
      reporterCount,
      duplicateCount: reporterCount - 1,
      communityConfirmations,
      aiConfidence: 0.79 + (i % 4) * 0.04,
      aiSummary: `${s.category} identified from the citizen description. Field verification recommended.`,
      analysisSource: "local",
    };
  });
  const history = issues.flatMap((issue) =>
    ["Reported", "Assigned", "In Progress", "Resolved"]
      .slice(
        0,
        ["Reported", "Assigned", "In Progress", "Resolved"].indexOf(
          issue.status,
        ) + 1,
      )
      .map((status, j) => ({
        id: `${issue.id}-${j}`,
        issueId: issue.id,
        status: status as IssueStatus,
        timestamp: new Date(
          new Date(issue.createdAt).getTime() +
            (new Date(issue.updatedAt).getTime() -
              new Date(issue.createdAt).getTime()) *
              (j /
                Math.max(
                  1,
                  ["Reported", "Assigned", "In Progress", "Resolved"].indexOf(
                    issue.status,
                  ),
                )),
        ).toISOString(),
        note: [
          "Report received and classified.",
          `Routed to ${issue.department}.`,
          "Maintenance crew is working on site.",
          issue.demoResolutionEvidence
            ? "Demo case: illustrated authority and citizen after-photos show the completed work. These are not real submissions."
            : "Repairs completed and site verified.",
        ][j],
      })),
  );
  return { issues, reports: [], history, notes: [], confirmations: [] };
}
