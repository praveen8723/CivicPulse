import { Issue, IssueCategory } from "@/types/civic";

export const CATEGORY_SPLIT_ZOOM = 14.5;

export interface MapMarkerGroup {
  key: string;
  issues: Issue[];
  latitude: number;
  longitude: number;
  reportCount: number;
  category?: IssueCategory;
  offset: [number, number];
  splitByCategory: boolean;
}

interface Point {
  x: number;
  y: number;
}

function nearbyBuckets(
  issues: Issue[],
  project: (longitude: number, latitude: number) => Point,
  radius: number,
) {
  const buckets: { issues: Issue[]; point: Point }[] = [];
  for (const issue of issues) {
    const point = project(issue.longitude, issue.latitude);
    const bucket = buckets.find(
      (item) =>
        Math.hypot(item.point.x - point.x, item.point.y - point.y) <= radius,
    );
    if (bucket) {
      const count = bucket.issues.length;
      bucket.point = {
        x: (bucket.point.x * count + point.x) / (count + 1),
        y: (bucket.point.y * count + point.y) / (count + 1),
      };
      bucket.issues.push(issue);
    } else buckets.push({ issues: [issue], point });
  }
  return buckets;
}

function markerGroup(
  issues: Issue[],
  category?: IssueCategory,
  offset: [number, number] = [0, 0],
  splitByCategory = false,
): MapMarkerGroup {
  return {
    key: issues
      .map((issue) => issue.id)
      .sort()
      .join("|"),
    issues,
    latitude:
      issues.reduce((sum, issue) => sum + issue.latitude, 0) / issues.length,
    longitude:
      issues.reduce((sum, issue) => sum + issue.longitude, 0) / issues.length,
    reportCount: issues.reduce((sum, issue) => sum + issue.reporterCount, 0),
    category,
    offset,
    splitByCategory,
  };
}

export function groupIssuesForMap(
  issues: Issue[],
  zoom: number,
  project: (longitude: number, latitude: number) => Point,
): MapMarkerGroup[] {
  if (!issues.length) return [];
  if (zoom < CATEGORY_SPLIT_ZOOM)
    return nearbyBuckets(issues, project, 52).map(({ issues: bucket }) =>
      markerGroup(bucket),
    );

  return nearbyBuckets(issues, project, 28).flatMap(({ issues: bucket }) => {
    const categories = new Map<IssueCategory, Issue[]>();
    for (const issue of bucket) {
      const categoryIssues = categories.get(issue.category) ?? [];
      categoryIssues.push(issue);
      categories.set(issue.category, categoryIssues);
    }
    const groups = [...categories.entries()];
    return groups.map(([category, categoryIssues], index) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * index) / groups.length;
      const offset: [number, number] =
        groups.length > 1
          ? [Math.round(Math.cos(angle) * 56), Math.round(Math.sin(angle) * 56)]
          : [0, 0];
      return markerGroup(categoryIssues, category, offset, groups.length > 1);
    });
  });
}
