import { Issue, IssueCategory } from "@/types/civic";

const illustrations: Record<IssueCategory, string> = {
  Pothole: "/case-illustrations/pothole.webp",
  "Road Damage": "/case-illustrations/road-damage.webp",
  "Garbage / Waste": "/case-illustrations/garbage.webp",
  "Water Leakage": "/case-illustrations/water-leak.webp",
  Waterlogging: "/case-illustrations/waterlogging.webp",
  "Drainage / Sewage": "/case-illustrations/drainage.webp",
  "Broken Streetlight": "/case-illustrations/streetlight.webp",
  "Fallen Tree": "/case-illustrations/fallen-tree.webp",
  "Traffic Signal": "/case-illustrations/traffic-signal.webp",
  "Traffic / Congestion": "/case-illustrations/traffic-congestion.webp",
  "Public Property Damage": "/case-illustrations/property-damage.webp",
  Other: "/case-illustrations/other.webp",
};

export function issueImage(issue: Issue) {
  const illustrative =
    !issue.imageUrl || issue.imageUrl === "/demo-pothole.png";
  return { src: issue.imageUrl || illustrations[issue.category], illustrative };
}
