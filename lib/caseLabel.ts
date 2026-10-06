import { Issue } from "@/types/civic";

export function caseNumber(id: string) {
  const match = /^(?:CP-\d{4}-|CASE-)(\d+)$/.exec(id);
  return match ? `Case ${Number(match[1])}` : `Case ${id.replace(/^CP-/, "").slice(-6)}`;
}

export function caseLabel(issue: Pick<Issue, "id" | "category" | "address">) {
  return `${issue.category} in ${issue.address.split(",")[0]} · ${caseNumber(issue.id)}`;
}

export function nextCaseId(issues: Pick<Issue, "id">[]) {
  const highest = Math.max(0, ...issues.map(({ id }) => {
    const match = /^(?:CP-\d{4}-|CASE-)(\d+)$/.exec(id);
    return match ? Number(match[1]) : 0;
  }));
  return `CASE-${highest + 1}`;
}
