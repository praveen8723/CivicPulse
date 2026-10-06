"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Analysis, CivicState, ReportInput } from "@/types/civic";
import { createDemoState } from "@/lib/demoData";
import {
  LocalIssueRepository,
  registerReport,
  STORAGE_KEY,
} from "@/services/issueRepository";
import { calculatePriorityScore } from "@/lib/priority";
import { caseLabel } from "@/lib/caseLabel";
import { useCaseLookupTool } from "./useCaseLookupTool";
interface ContextValue {
  state: CivicState;
  ready: boolean;
  commit: (state: CivicState) => boolean;
  notify: (text: string) => void;
  submit: (
    input: ReportInput,
    analysis: Analysis,
  ) => ReturnType<typeof registerReport> | null;
  confirmAffected: (id: string) => void;
  reset: () => void;
}
const Context = createContext<ContextValue | null>(null);
export function CivicProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CivicState>(() =>
    createDemoState(1791190800000),
  );
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  useCaseLookupTool(state, ready);
  const notify = useCallback((text: string) => setToast(text), []);
  useEffect(() => {
    const repository = new LocalIssueRepository();
    try {
      const initial = repository.load();
      setState(initial);
      repository.save(initial);
    } catch {
      setState(createDemoState());
      setToast(
        "Saved data unavailable. Using a temporary demo; changes may not persist.",
      );
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        try {
          setState(repository.load());
        } catch {
          setToast("Unable to sync saved data.");
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  const commit = (next: CivicState) => {
    try {
      new LocalIssueRepository().save(next);
      setState(next);
      return true;
    } catch {
      notify(
        "Could not save. Browser storage may be full or disabled. Remove large photos or allow site storage.",
      );
      return false;
    }
  };
  const submit = (input: ReportInput, analysis: Analysis) => {
    const result = registerReport(state, input, analysis);
    if (!commit(result.state)) return null;
    notify(
      result.merged
        ? "Your report was linked to the existing case."
        : `${caseLabel(result.issue)} registered.`,
    );
    return result;
  };
  const confirmAffected = (id: string) => {
    if (state.confirmations.includes(id)) return;
    const issues = state.issues.map((issue) => {
      if (issue.id !== id) return issue;
      const updated = {
        ...issue,
        communityConfirmations: issue.communityConfirmations + 1,
      };
      const priority = calculatePriorityScore(updated);
      return {
        ...updated,
        priorityScore: priority.score,
        severity: priority.severity,
        factors: priority.factors,
      };
    });
    if (
      commit({ ...state, issues, confirmations: [...state.confirmations, id] })
    )
      notify("Your confirmation strengthens this case.");
  };
  return (
    <Context.Provider
      value={{
        state,
        ready,
        commit,
        notify,
        submit,
        confirmAffected,
        reset: () => {
          if (commit(createDemoState()))
            notify("Demo reset. Ready for your next presentation.");
        },
      }}
    >
      {ready ? (
        children
      ) : (
        <div className="workspace-loading" role="status">
          <span className="spinner" />
          Opening your city workspace…
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useCivic() {
  const value = useContext(Context);
  if (!value) throw new Error("CivicProvider missing");
  return value;
}
