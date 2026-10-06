import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { classifyLocally } from "../services/issueClassifier";
import { createDemoState, locations } from "../lib/demoData";
import { calculatePriorityScore, severityFromScore } from "../lib/priority";
import {
  distanceMetres,
  findNearbyDuplicates,
} from "../lib/duplicateDetection";
import {
  registerReport,
  changeIssueStatus,
  confirmIssueFixedByCitizen,
  LocalIssueRepository,
  repairDuplicateIssueIds,
} from "../services/issueRepository";
import { caseLabel } from "../lib/caseLabel";
import { categories } from "../types/civic";
import { publicContacts, suggestedTrafficStation } from "../lib/responsibility";
import { issueImage } from "../lib/issueImages";
import { translateInterface } from "../lib/translations";
import { groupIssuesForMap } from "../lib/mapGrouping";
const description =
  "Large pothole outside the school. Cars are swerving and it is dangerous for students.";
test("common complaints classify predictably and unknown issues go to support", () => {
  for (const [text, expected] of [
    ["Huge pothole in the street", "Pothole"],
    ["Garbage piling up", "Garbage / Waste"],
    ["Traffic light is out", "Traffic Signal"],
    ["Heavy traffic jam near the junction", "Traffic / Congestion"],
    ["Water leak from a burst pipe", "Water Leakage"],
    ["Rainwater is waterlogging the road", "Waterlogging"],
    ["Fallen tree on the street", "Fallen Tree"],
    ["This sign is missing", "Other"],
  ])
    assert.equal(classifyLocally(text).category, expected);
});
test("priority is deterministic, bounded, and uses consistent thresholds", () => {
  const input = { category: "Pothole" as const, description };
  assert.deepEqual(
    calculatePriorityScore(input),
    calculatePriorityScore(input),
  );
  assert.equal(severityFromScore(29), "Low");
  assert.equal(severityFromScore(30), "Medium");
  assert.equal(severityFromScore(55), "High");
  assert.equal(severityFromScore(80), "Critical");
  assert.ok(
    calculatePriorityScore({
      ...input,
      reporterCount: 100000,
      communityConfirmations: 100000,
      createdAt: "2020-01-01",
      status: "Reported",
    }).score <= 100,
  );
});
test("demo finds the nearby school pothole but rejects distant, unrelated and resolved cases", () => {
  const state = createDemoState(),
    input = { ...locations[0], category: "Pothole" as const, description };
  assert.equal(
    findNearbyDuplicates(input, state.issues)[0].issue.id,
    "CP-2026-0892",
  );
  assert.equal(
    findNearbyDuplicates({ ...input, latitude: 13.5 }, state.issues).length,
    0,
  );
  assert.equal(
    findNearbyDuplicates(
      {
        ...input,
        description: "Maintenance to a completely different utility",
      },
      state.issues,
    ).length,
    0,
  );
  assert.equal(
    findNearbyDuplicates(
      input,
      state.issues.map((i) => ({ ...i, status: "Resolved" as const })),
    ).length,
    0,
  );
  assert.equal(distanceMetres(input, input), 0);
});
test("duplicate reports link a receipt to one master case and increment report volume", () => {
  const initial = createDemoState();
  const result = registerReport(
    initial,
    { ...locations[0], description },
    classifyLocally(description),
  );
  assert.equal(result.merged, true);
  assert.equal(result.issue.id, "CP-2026-0892");
  assert.equal(result.issue.reporterCount, 7);
  assert.equal(result.state.issues.length, 48);
  assert.equal(result.state.reports[0].issueId, result.issue.id);
  assert.equal(initial.issues[0].reporterCount, 6);
  assert.equal(result.state.reports[0].id, result.reportId);
});
test("a novel issue creates a new case with department routing and history", () => {
  const initial = createDemoState();
  const result = registerReport(
    initial,
    {
      ...locations[0],
      latitude: 13.8,
      description: "Water leak from a burst pipe beside the park.",
    },
    classifyLocally("Water leak from a burst pipe beside the park."),
  );
  assert.equal(result.merged, false);
  assert.equal(result.state.issues.length, 49);
  assert.equal(result.issue.department, "Water Supply");
  assert.equal(result.issue.status, "Reported");
  assert.match(result.issue.id, /^CASE-\d+$/);
  assert.match(caseLabel(result.issue), /Water Leakage in Koramangala.*Case/);
  assert.equal(publicContacts[result.issue.category].phone, "1916");
  assert.equal(result.state.history.at(-1)?.issueId, result.issue.id);
});
test("resolution needs an authority photo and a citizen confirmation photo in either order", () => {
  const initial = createDemoState();
  assert.throws(
    () =>
      changeIssueStatus(
        initial,
        "CP-2026-0892",
        "Resolved",
        "Done",
        "Roads & Infrastructure",
      ),
    /after-photo/,
  );
  const updated = changeIssueStatus(
    initial,
    "CP-2026-0892",
    "Resolved",
    "Repaired and verified.",
    "Roads & Infrastructure",
    "data:image/jpeg;base64,demo",
  );
  const issue = updated.issues.find((i) => i.id === "CP-2026-0892")!;
  assert.equal(issue.status, "In Progress");
  assert.equal(issue.resolutionNote, "Repaired and verified.");
  assert.equal(issue.resolvedAt, undefined);
  assert.equal(updated.history.at(-1)?.status, "In Progress");
  const confirmed = confirmIssueFixedByCitizen(
    updated,
    issue.id,
    "data:image/jpeg;base64,demo",
    "Road is level.",
  );
  assert.equal(
    confirmed.issues.find((i) => i.id === issue.id)?.status,
    "Resolved",
  );
  assert.ok(confirmed.issues.find((i) => i.id === issue.id)?.resolvedAt);
  const reopened = changeIssueStatus(
    confirmed,
    issue.id,
    "In Progress",
    "Reopened for inspection.",
    issue.department,
  );
  assert.equal(
    reopened.issues.find((i) => i.id === issue.id)?.resolvedAt,
    undefined,
  );
  assert.equal(
    reopened.issues.find((i) => i.id === issue.id)?.citizenResolutionImageUrl,
    undefined,
  );
  const citizenFirst = confirmIssueFixedByCitizen(
    initial,
    issue.id,
    "data:image/jpeg;base64,demo",
    "Fixed here.",
  );
  assert.equal(
    citizenFirst.issues.find((i) => i.id === issue.id)?.status,
    "Assigned",
  );
  const progressed = changeIssueStatus(
    citizenFirst,
    issue.id,
    "In Progress",
    "Team inspecting",
    issue.department,
  );
  assert.equal(
    progressed.issues.find((i) => i.id === issue.id)?.citizenResolutionImageUrl,
    "data:image/jpeg;base64,demo",
  );
  const final = changeIssueStatus(
    progressed,
    issue.id,
    "Resolved",
    "Done",
    issue.department,
    "data:image/jpeg;base64,demo",
  );
  assert.equal(final.issues.find((i) => i.id === issue.id)?.status, "Resolved");
});
test("every category has an illustration and traffic area suggests a published station", () => {
  for (const category of categories) {
    const image = issueImage({ category } as Parameters<typeof issueImage>[0]);
    assert.ok(image.src.startsWith("/case-illustrations/"));
    assert.ok(
      existsSync(join(process.cwd(), "public", image.src.slice(1))),
      `${category} image is missing`,
    );
  }
  assert.equal(
    suggestedTrafficStation("Electronic City, Phase 1")?.phone,
    "9480801832",
  );
  assert.equal(suggestedTrafficStation("Unknown road"), undefined);
});
test("seed data has consistent severity, report counts and unique identifiers", () => {
  const { issues } = createDemoState();
  assert.equal(issues.length, 48);
  assert.equal(new Set(issues.map((i) => i.id)).size, 48);
  assert.equal(issues.filter((issue) => issue.status === "Resolved").length, 2);
  for (const issue of issues) {
    if (issue.status === "Resolved") {
      assert.equal(issue.demoResolutionEvidence, true);
      assert.ok(issue.resolutionImageUrl && issue.citizenResolutionImageUrl);
      for (const path of [
        issue.resolutionImageUrl,
        issue.citizenResolutionImageUrl,
      ])
        assert.ok(existsSync(join(process.cwd(), "public", path!.slice(1))));
    }
    assert.equal(issue.severity, severityFromScore(issue.priorityScore));
    assert.equal(issue.reporterCount, issue.duplicateCount + 1);
    assert.equal(
      Math.min(
        100,
        issue.factors.reduce((s, f) => s + f.value, 0),
      ),
      issue.priorityScore,
    );
    assert.ok(issue.latitude > 12 && issue.latitude < 14);
    assert.ok(issue.longitude > 77 && issue.longitude < 79);
  }
});
test("Kannada interface translations preserve IDs and form values", () => {
  assert.equal(
    translateInterface("  Report an issue  "),
    "  ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ  ",
  );
  assert.equal(translateInterface("Case 892"), "ಪ್ರಕರಣ 892");
  assert.equal(translateInterface("CP-2026-0892"), "CP-2026-0892");
  assert.equal(
    translateInterface("Koramangala 5th Block"),
    "Koramangala 5th Block",
  );
});
test("reopening a resolved demo clears its illustrative evidence", () => {
  const state = createDemoState();
  const sample = state.issues.find((issue) => issue.demoResolutionEvidence)!;
  const kept = changeIssueStatus(
    state,
    sample.id,
    "Resolved",
    "Note updated.",
    sample.department,
    sample.resolutionImageUrl,
  );
  assert.equal(
    kept.issues.find((issue) => issue.id === sample.id)?.resolvedAt,
    sample.resolvedAt,
  );
  assert.throws(
    () =>
      changeIssueStatus(
        state,
        sample.id,
        "Resolved",
        "Replace photo",
        sample.department,
        "data:image/jpeg;base64,demo",
      ),
    /Reopen/,
  );
  const reopened = changeIssueStatus(
    state,
    sample.id,
    "In Progress",
    "Checking again",
    sample.department,
  );
  const issue = reopened.issues.find((item) => item.id === sample.id)!;
  assert.equal(issue.demoResolutionEvidence, undefined);
  assert.equal(issue.resolutionImageUrl, undefined);
  assert.equal(issue.citizenResolutionImageUrl, undefined);
});
test("map totals combine nearby reports then split issue types at close zoom", () => {
  const samples = createDemoState().issues;
  const water = {
    ...samples.find((issue) => issue.category === "Waterlogging")!,
    id: "CASE-1001",
    latitude: 12.9716,
    longitude: 77.5946,
    reporterCount: 6,
  };
  const waste = {
    ...samples.find((issue) => issue.category === "Garbage / Waste")!,
    id: "CASE-1002",
    latitude: 12.9716,
    longitude: 77.5946,
    reporterCount: 2,
  };
  const project = (longitude: number, latitude: number) => ({
    x: longitude * 1000,
    y: latitude * 1000,
  });
  const zoomedOut = groupIssuesForMap([water, waste], 11, project);
  assert.equal(zoomedOut.length, 1);
  assert.equal(zoomedOut[0].reportCount, 8);
  const zoomedIn = groupIssuesForMap([water, waste], 16, project);
  assert.equal(zoomedIn.length, 2);
  assert.deepEqual(
    new Map(zoomedIn.map((group) => [group.category, group.reportCount])),
    new Map([
      ["Waterlogging", 6],
      ["Garbage / Waste", 2],
    ]),
  );
  assert.notDeepEqual(zoomedIn[0].offset, zoomedIn[1].offset);
});

test("saved duplicate case IDs are repaired without losing distinct cases", () => {
  const sample = createDemoState().issues.find(
    (issue) => issue.id === "CP-2026-0940",
  )!;
  const updated = {
    ...sample,
    updatedAt: "2026-10-06T12:00:00.000Z",
    reporterCount: sample.reporterCount + 1,
  };
  const distinct = {
    ...sample,
    title: "Separate traffic signal fault",
    createdAt: "2026-10-06T11:00:00.000Z",
  };
  const repaired = repairDuplicateIssueIds([
    sample,
    updated,
    distinct,
    { ...distinct, reporterCount: distinct.reporterCount + 2 },
  ]);
  assert.equal(repaired.length, 2);
  assert.equal(repaired[0].id, sample.id);
  assert.equal(repaired[0].reporterCount, updated.reporterCount);
  assert.equal(repaired[1].title, distinct.title);
  assert.equal(repaired[1].reporterCount, distinct.reporterCount + 2);
  assert.match(repaired[1].id, /^CASE-\d+$/);
  assert.equal(new Set(repaired.map((issue) => issue.id)).size, 2);
});

test("older untouched browser demo cases gain resolved examples without overriding edited cases", () => {
  const old = createDemoState();
  for (const issue of old.issues.filter(
    (item) => item.demoResolutionEvidence,
  )) {
    issue.status = "In Progress";
    delete issue.resolvedAt;
    delete issue.resolutionImageUrl;
    delete issue.citizenResolutionImageUrl;
    delete issue.demoResolutionEvidence;
  }
  old.history.push({
    id: "user-status-change",
    issueId: "CP-2026-0936",
    status: "In Progress",
    timestamp: new Date().toISOString(),
    note: "User changed this case.",
  });
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => JSON.stringify(old) },
  });
  try {
    const loaded = new LocalIssueRepository().load();
    assert.equal(
      loaded.issues.find((issue) => issue.id === "CP-2026-0931")?.status,
      "Resolved",
    );
    assert.equal(
      loaded.issues.find((issue) => issue.id === "CP-2026-0936")?.status,
      "In Progress",
    );
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
