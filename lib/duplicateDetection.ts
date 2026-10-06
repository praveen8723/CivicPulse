import { Issue, IssueCategory } from "@/types/civic";
export const DUPLICATE_RULES = {
  radiusMetres: 250,
  maxAgeDays: 30,
  minTextSimilarity: 0.16,
  threshold: 80,
};
export function distanceMetres(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude),
    dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
const stop = new Set([
  "the",
  "and",
  "for",
  "has",
  "are",
  "this",
  "that",
  "with",
  "near",
  "outside",
  "have",
  "from",
]);
function tokens(text: string) {
  return new Set(
    text
      .toLowerCase()
      .match(/[a-z]+/g)
      ?.filter((w) => w.length > 2 && !stop.has(w)) ?? [],
  );
}
export function textSimilarity(a: string, b: string) {
  const x = tokens(a),
    y = tokens(b);
  return (
    [...x].filter((w) => y.has(w)).length /
    Math.max(1, Math.min(x.size, y.size))
  );
}
export function findNearbyDuplicates(
  input: {
    category: IssueCategory;
    description: string;
    latitude: number;
    longitude: number;
  },
  issues: Issue[],
  now = Date.now(),
) {
  return issues
    .filter((i) => i.status !== "Resolved" && i.category === input.category)
    .map((issue) => {
      const distance = distanceMetres(input, issue),
        similarity = textSimilarity(input.description, issue.description),
        age = (now - new Date(issue.createdAt).getTime()) / 86400000;
      return {
        issue,
        distance,
        similarity,
        age,
        score:
          40 +
          (distance <= 100 ? 35 : 20) +
          (similarity >= DUPLICATE_RULES.minTextSimilarity ? 25 : 0) +
          (age <= 30 ? 10 : 0),
      };
    })
    .filter(
      (m) =>
        m.distance <= DUPLICATE_RULES.radiusMetres &&
        m.similarity >= DUPLICATE_RULES.minTextSimilarity &&
        m.age <= DUPLICATE_RULES.maxAgeDays &&
        m.score >= DUPLICATE_RULES.threshold,
    )
    .sort((a, b) => b.score - a.score || a.distance - b.distance);
}
