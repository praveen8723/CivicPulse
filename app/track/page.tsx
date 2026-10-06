"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { useCivic } from "@/components/CivicProvider";
import { caseNumber } from "@/lib/caseLabel";
export default function Track() {
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const { state } = useCivic();
  const router = useRouter();
  return (
    <div className="page track-page">
      <div className="track-intro">
        <span className="track-icon">
          <Search size={29} />
        </span>
        <span className="eyebrow">EVERY STEP, IN THE OPEN</span>
        <h1>Your report. Its progress.</h1>
        <p>
          Enter a case number (for example, 892), tracking reference or report receipt to follow the work happening on your
          street.
        </p>
      </div>
      <section className="panel track-search">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const query = id.trim().toUpperCase();
            const report = state.reports.find((r) => r.id === query);
            const issue = state.issues.find(
              (i) => i.id === query || i.id === report?.issueId || (/^(?:CASE\s*)?\d+$/.test(query) && caseNumber(i.id).toUpperCase() === `CASE ${Number(query.replace(/^CASE\s*/, ""))}`),
            );
            if (issue) router.push(`/track/${issue.id}`);
            else
              setError(
                "We couldn’t find that ID in this browser’s demo data. Check the ID and try again.",
              );
          }}
        >
          <label htmlFor="tracking-id">Case number, tracking reference or report receipt</label>
          <div className="tracking-input">
            <input
              id="tracking-id"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setError("");
              }}
              placeholder="e.g. 892"
              required
            />
            <button className="button primary" type="submit">
              <Search size={17} />
              Track complaint
            </button>
          </div>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </form>
        <div className="track-example">
          <span>Want to see how it works?</span>
          <Link href="/track/CP-2026-0892">
            Follow our school-zone pothole case
          </Link>
        </div>
      </section>
      <p className="track-note">
        <ShieldCheck size={17} />
        Demo reports and status updates are shared within this browser.
      </p>
    </div>
  );
}
