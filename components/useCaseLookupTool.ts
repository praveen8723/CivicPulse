"use client";
import { useEffect } from "react";
import { CivicState } from "@/types/civic";
interface ToolRegistry {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
}
export function useCaseLookupTool(state: CivicState, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const registry = (document as Document & { modelContext?: ToolRegistry })
      .modelContext;
    if (!registry?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        registry.registerTool(
          {
            name: "lookup_civic_case",
            description:
              "Look up a CivicPulse case or report receipt in this browser’s demo data. Returns public case progress without changing it.",
            inputSchema: {
              type: "object",
              properties: { id: { type: "string" } },
              required: ["id"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input) {
              if (
                !input ||
                typeof input !== "object" ||
                !("id" in input) ||
                typeof input.id !== "string" ||
                input.id.length > 80
              )
                throw new Error(
                  "A valid case ID or report receipt is required.",
                );
              const id = input.id.trim().toUpperCase();
              const report = state.reports.find((r) => r.id === id);
              const issue = state.issues.find(
                (i) => i.id === id || i.id === report?.issueId,
              );
              if (!issue) return { found: false };
              return {
                found: true,
                id: issue.id,
                title: issue.title,
                status: issue.status,
                severity: issue.severity,
                priorityScore: issue.priorityScore,
                department: issue.department,
                reporterCount: issue.reporterCount,
                url: `/track/${issue.id}`,
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Browser agent tools are optional; the interface remains fully usable. */
    }
    return () => lifecycle.abort();
  }, [state, ready]);
}
