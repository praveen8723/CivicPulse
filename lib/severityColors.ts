import type { Severity } from "@/types/civic";

/** Match the severity tokens in app/monochrome.css for both map renderers. */
export const severityColors: Record<Severity, string> = {
  Critical: "#f87171",
  High: "#fb923c",
  Medium: "#facc15",
  Low: "#34d399",
};
