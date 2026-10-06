export const categories = [
  "Pothole",
  "Road Damage",
  "Garbage / Waste",
  "Water Leakage",
  "Waterlogging",
  "Drainage / Sewage",
  "Broken Streetlight",
  "Fallen Tree",
  "Traffic Signal",
  "Traffic / Congestion",
  "Public Property Damage",
  "Other",
] as const;
export type IssueCategory = (typeof categories)[number];
export const statuses = [
  "Reported",
  "Assigned",
  "In Progress",
  "Resolved",
] as const;
export type IssueStatus = (typeof statuses)[number];
export type Severity = "Low" | "Medium" | "High" | "Critical";
export interface PriorityFactor {
  label: string;
  value: number;
}
export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: Severity;
  priorityScore: number;
  factors: PriorityFactor[];
  status: IssueStatus;
  department: string;
  latitude: number;
  longitude: number;
  address: string;
  ward: string;
  imageUrl?: string;
  resolutionImageUrl?: string;
  citizenResolutionImageUrl?: string;
  citizenResolutionNote?: string;
  demoResolutionEvidence?: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  aiConfidence: number;
  aiSummary: string;
  analysisSource: "local" | "provider" | "ollama";
  sourcePlatform?: "Reddit" | "Instagram" | "Other public post";
  sourceUrl?: string;
  locationApproximate?: boolean;
  duplicateCount: number;
  communityConfirmations: number;
  reporterCount: number;
  resolutionNote?: string;
}
export interface CitizenReport {
  id: string;
  issueId: string;
  description: string;
  imageUrl?: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}
export interface IssueStatusHistory {
  id: string;
  issueId: string;
  status: IssueStatus;
  timestamp: string;
  note: string;
}
export interface InternalNote {
  id: string;
  issueId: string;
  text: string;
  timestamp: string;
}
export interface CivicState {
  issues: Issue[];
  reports: CitizenReport[];
  history: IssueStatusHistory[];
  notes: InternalNote[];
  confirmations: string[];
}
export interface ReportInput {
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  ward: string;
  imageUrl?: string;
}
export interface Analysis {
  category: IssueCategory;
  confidence: number;
  summary: string;
  source: "local" | "provider" | "ollama";
}
