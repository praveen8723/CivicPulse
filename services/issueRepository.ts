import {
  Analysis,
  CivicState,
  Issue,
  IssueStatus,
  ReportInput,
} from "@/types/civic";
import { createDemoState } from "@/lib/demoData";
import { findNearbyDuplicates } from "@/lib/duplicateDetection";
import { calculatePriorityScore } from "@/lib/priority";
import { routing } from "@/lib/departmentRouting";
import { nextCaseId } from "@/lib/caseLabel";
export interface IssueRepository {
  load(): CivicState;
  save(state: CivicState): void;
}
export const STORAGE_KEY = "civicpulse-demo-v1";

// Older saved demos can contain the same case ID more than once. Keep one
// record for repeated copies of a case, but give genuinely different cases a
// new ID so neither report disappears from the workspace.
export function repairDuplicateIssueIds(issues: Issue[]): Issue[] {
  const repaired: Issue[] = [];
  const byId = new Map<string, number[]>();
  const reservedIds = new Set(issues.map((issue) => issue.id));
  let nextId = Number(nextCaseId(issues).slice(5));

  for (const issue of issues) {
    const sameIdIndices = byId.get(issue.id);
    if (!sameIdIndices) {
      byId.set(issue.id, [repaired.length]);
      repaired.push(issue);
      continue;
    }

    const existingIndex = sameIdIndices.find((index) => {
      const existing = repaired[index];
      return (
        existing.createdAt === issue.createdAt &&
        existing.category === issue.category &&
        existing.address === issue.address &&
        existing.title === issue.title
      );
    });
    if (existingIndex !== undefined) {
      const existing = repaired[existingIndex];
      const latest = existing.updatedAt >= issue.updatedAt ? existing : issue;
      const other = latest === existing ? issue : existing;
      repaired[existingIndex] = {
        ...latest,
        imageUrl: latest.imageUrl || other.imageUrl,
        reporterCount: Math.max(existing.reporterCount, issue.reporterCount),
        duplicateCount: Math.max(existing.duplicateCount, issue.duplicateCount),
        communityConfirmations: Math.max(
          existing.communityConfirmations,
          issue.communityConfirmations,
        ),
        ...(latest.status === other.status
          ? {
              resolutionImageUrl:
                latest.resolutionImageUrl || other.resolutionImageUrl,
              citizenResolutionImageUrl:
                latest.citizenResolutionImageUrl ||
                other.citizenResolutionImageUrl,
              resolutionNote: latest.resolutionNote || other.resolutionNote,
              citizenResolutionNote:
                latest.citizenResolutionNote || other.citizenResolutionNote,
            }
          : {}),
      };
      continue;
    }

    while (reservedIds.has(`CASE-${nextId}`)) nextId++;
    const newId = `CASE-${nextId++}`;
    reservedIds.add(newId);
    sameIdIndices.push(repaired.length);
    repaired.push({ ...issue, id: newId });
  }
  return repaired;
}

export class LocalIssueRepository implements IssueRepository {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemoState();
    const parsed = JSON.parse(raw);
    if (
      !Array.isArray(parsed.issues) ||
      !Array.isArray(parsed.reports) ||
      !Array.isArray(parsed.history) ||
      !Array.isArray(parsed.notes) ||
      !Array.isArray(parsed.confirmations)
    )
      throw new Error("Saved demo data could not be read.");
    const state = {
      ...(parsed as CivicState),
      issues: repairDuplicateIssueIds((parsed as CivicState).issues),
    };
    // Add new demo categories to older browser data once.
    const demo = createDemoState();
    const start = Number(nextCaseId(state.issues).slice(5));
    const examples = (
      ["Waterlogging", "Traffic / Congestion"] as const
    ).flatMap((category) =>
      state.issues.some((issue) => issue.category === category)
        ? []
        : demo.issues.filter((issue) => issue.category === category),
    );
    const added = examples.map((issue, index) => ({
      ...issue,
      id: `CASE-${start + index}`,
    }));
    const resolvedDemoExamples = demo.issues.filter(
      (issue) => issue.demoResolutionEvidence,
    );
    const upgradeIds = new Set(
      resolvedDemoExamples
        .filter((sample) => {
          const current = state.issues.find((issue) => issue.id === sample.id);
          return (
            current &&
            !current.demoResolutionEvidence &&
            !current.resolutionImageUrl &&
            !current.citizenResolutionImageUrl &&
            !state.reports.some((report) => report.issueId === sample.id) &&
            !state.notes.some((note) => note.issueId === sample.id) &&
            !state.confirmations.includes(sample.id) &&
            state.history
              .filter((event) => event.issueId === sample.id)
              .every(
                (event) =>
                  event.id.startsWith(`${sample.id}-`) ||
                  event.note.startsWith("Reopened for photo verification"),
              )
          );
        })
        .map((issue) => issue.id),
    );
    const legacyWithoutEvidence = state.issues.filter(
      (issue) =>
        !upgradeIds.has(issue.id) &&
        issue.status === "Resolved" &&
        (!issue.resolutionImageUrl || !issue.citizenResolutionImageUrl),
    );
    const migratedAt = new Date().toISOString();
    return {
      ...state,
      history: [
        ...state.history,
        ...legacyWithoutEvidence.map((issue) => ({
          id: crypto.randomUUID(),
          issueId: issue.id,
          status: "In Progress" as const,
          timestamp: migratedAt,
          note: "Reopened for photo verification: both authority and citizen evidence are required.",
        })),
        ...[...upgradeIds].map((id) => ({
          id: `${id}-demo-resolved`,
          issueId: id,
          status: "Resolved" as const,
          timestamp: migratedAt,
          note: "Demo case: illustrated authority and citizen after-photos show the completed work. These are not real submissions.",
        })),
        ...examples.flatMap((example, index) =>
          demo.history
            .filter((event) => event.issueId === example.id)
            .map((event) => ({
              ...event,
              id: `${added[index].id}-${event.status}`,
              issueId: added[index].id,
            })),
        ),
      ],
      issues: [...state.issues, ...added].map((issue) => {
        const sample = upgradeIds.has(issue.id)
          ? resolvedDemoExamples.find((item) => item.id === issue.id)
          : undefined;
        const missingProof =
          !sample &&
          issue.status === "Resolved" &&
          (!issue.resolutionImageUrl || !issue.citizenResolutionImageUrl);
        const current = sample
          ? {
              ...issue,
              status: "Resolved" as const,
              resolvedAt: migratedAt,
              updatedAt: migratedAt,
              resolutionImageUrl: sample.resolutionImageUrl,
              citizenResolutionImageUrl: sample.citizenResolutionImageUrl,
              resolutionNote: sample.resolutionNote,
              citizenResolutionNote: sample.citizenResolutionNote,
              demoResolutionEvidence: true,
            }
          : missingProof
            ? {
                ...issue,
                status: "In Progress" as const,
                resolvedAt: undefined,
              }
            : issue;
        const priority = calculatePriorityScore(current);
        return {
          ...current,
          priorityScore: priority.score,
          severity: priority.severity,
          factors: priority.factors,
        };
      }),
    };
  }
  save(state: CivicState) {
    if (
      new Set(state.issues.map((issue) => issue.id)).size !==
      state.issues.length
    )
      throw new Error("Case IDs must be unique.");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
export function registerReport(
  state: CivicState,
  input: ReportInput,
  analysis: Analysis,
) {
  const timestamp = new Date().toISOString(),
    reportId = `CR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const match = findNearbyDuplicates(
    { ...input, category: analysis.category },
    state.issues,
  )[0];
  let issue: Issue;
  if (match) {
    const count = match.issue.reporterCount + 1,
      priority = calculatePriorityScore({
        ...match.issue,
        reporterCount: count,
      });
    issue = {
      ...match.issue,
      reporterCount: count,
      duplicateCount: match.issue.duplicateCount + 1,
      updatedAt: timestamp,
      priorityScore: priority.score,
      severity: priority.severity,
      factors: priority.factors,
    };
  } else {
    const priority = calculatePriorityScore({
      category: analysis.category,
      description: input.description,
    });
    issue = {
      ...input,
      id: nextCaseId(state.issues),
      title: input.description.split(/[.!?]/)[0].slice(0, 90),
      category: analysis.category,
      severity: priority.severity,
      priorityScore: priority.score,
      factors: priority.factors,
      status: "Reported",
      department: routing[analysis.category],
      createdAt: timestamp,
      updatedAt: timestamp,
      aiConfidence: analysis.confidence,
      aiSummary: analysis.summary,
      analysisSource: analysis.source,
      reporterCount: 1,
      duplicateCount: 0,
      communityConfirmations: 0,
    };
  }
  const next: CivicState = {
    ...state,
    issues: match
      ? state.issues.map((i) => (i.id === issue.id ? issue : i))
      : [issue, ...state.issues],
    reports: [
      { id: reportId, issueId: issue.id, ...input, createdAt: timestamp },
      ...state.reports,
    ],
    history: match
      ? state.history
      : [
          ...state.history,
          {
            id: crypto.randomUUID(),
            issueId: issue.id,
            status: "Reported",
            timestamp,
            note: `Report classified and routed to ${issue.department}.`,
          },
        ],
  };
  return { state: next, issue, reportId, merged: !!match };
}
export function changeIssueStatus(
  state: CivicState,
  id: string,
  status: IssueStatus,
  note: string,
  department: string,
  resolutionImageUrl?: string,
): CivicState {
  const timestamp = new Date().toISOString();
  const old = state.issues.find((i) => i.id === id);
  if (!old) throw new Error("Issue not found.");
  const keepingResolution =
    status === "Resolved" &&
    old.status === "Resolved" &&
    resolutionImageUrl === old.resolutionImageUrl;
  if (status === "Resolved" && old.status === "Resolved" && !keepingResolution)
    throw new Error("Reopen the case before replacing resolution photos.");
  if (
    status === "Resolved" &&
    !keepingResolution &&
    !isUploadedPhoto(resolutionImageUrl)
  )
    throw new Error(
      "An authority after-photo is required to request resolution.",
    );
  const awaitingCitizen =
    status === "Resolved" && !old.citizenResolutionImageUrl;
  const actualStatus: IssueStatus = awaitingCitizen ? "In Progress" : status;
  const reopening = old.status === "Resolved" && status !== "Resolved";
  const priority = calculatePriorityScore({ ...old, status: actualStatus });
  return {
    ...state,
    issues: state.issues.map((i) =>
      i.id !== id
        ? i
        : {
            ...i,
            status: actualStatus,
            department,
            priorityScore: priority.score,
            severity: priority.severity,
            factors: priority.factors,
            updatedAt: timestamp,
            resolvedAt:
              actualStatus === "Resolved"
                ? keepingResolution
                  ? i.resolvedAt
                  : timestamp
                : undefined,
            resolutionNote:
              status === "Resolved"
                ? note || i.resolutionNote
                : reopening
                  ? undefined
                  : i.resolutionNote,
            resolutionImageUrl:
              status === "Resolved"
                ? resolutionImageUrl
                : reopening
                  ? undefined
                  : i.resolutionImageUrl,
            citizenResolutionImageUrl: reopening
              ? undefined
              : i.citizenResolutionImageUrl,
            citizenResolutionNote: reopening
              ? undefined
              : i.citizenResolutionNote,
            demoResolutionEvidence: reopening
              ? undefined
              : i.demoResolutionEvidence,
          },
    ),
    history: [
      ...state.history,
      {
        id: crypto.randomUUID(),
        issueId: id,
        status: actualStatus,
        timestamp,
        note: awaitingCitizen
          ? `${note || "Work completed."} Authority after-photo uploaded; awaiting a citizen confirmation photo.`
          : note ||
            `Status changed to ${actualStatus}. Assigned to ${department}.`,
      },
    ],
  };
}

function isUploadedPhoto(value?: string) {
  return (
    !!value &&
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}

export function confirmIssueFixedByCitizen(
  state: CivicState,
  id: string,
  photo: string,
  note: string,
): CivicState {
  const old = state.issues.find((issue) => issue.id === id);
  if (!old) throw new Error("Issue not found.");
  if (old.status === "Resolved")
    throw new Error("This case is already resolved.");
  if (!isUploadedPhoto(photo))
    throw new Error("Upload a photo of the fixed issue to confirm it.");
  const timestamp = new Date().toISOString();
  const resolved = !!old.resolutionImageUrl;
  const status: IssueStatus = resolved ? "Resolved" : old.status;
  const priority = calculatePriorityScore({ ...old, status });
  return {
    ...state,
    issues: state.issues.map((issue) =>
      issue.id !== id
        ? issue
        : {
            ...issue,
            citizenResolutionImageUrl: photo,
            citizenResolutionNote: note,
            status,
            priorityScore: priority.score,
            severity: priority.severity,
            factors: priority.factors,
            updatedAt: timestamp,
            resolvedAt: resolved ? timestamp : undefined,
          },
    ),
    history: [
      ...state.history,
      {
        id: crypto.randomUUID(),
        issueId: id,
        status,
        timestamp,
        note: resolved
          ? `Citizen confirmed the fix with a photo.${note ? ` ${note}` : ""}`
          : `Citizen uploaded a photo stating the issue is fixed; awaiting authority after-photo.${note ? ` ${note}` : ""}`,
      },
    ],
  };
}
