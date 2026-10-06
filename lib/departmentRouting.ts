import { IssueCategory } from "@/types/civic";
export const routing: Record<IssueCategory, string> = {
  Pothole: "Roads & Infrastructure",
  "Road Damage": "Roads & Infrastructure",
  "Garbage / Waste": "Solid Waste Management",
  "Water Leakage": "Water Supply",
  Waterlogging: "Storm Water Drains",
  "Drainage / Sewage": "Sewerage & Drainage",
  "Broken Streetlight": "Electrical & Lighting",
  "Fallen Tree": "Parks & Urban Forestry",
  "Traffic Signal": "Traffic Management",
  "Traffic / Congestion": "Traffic Management",
  "Public Property Damage": "Municipal Maintenance",
  Other: "Civic Support Desk",
};
export const departments = [...new Set(Object.values(routing))];
export function routeIssueToDepartment(category: IssueCategory) {
  return routing[category];
}
