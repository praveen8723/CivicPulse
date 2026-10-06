"use client";
import { Select } from "@/components/Select";
import { useState } from "react";
import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { useCivic } from "@/components/CivicProvider";
import {
  filterIssues,
  initialFilters,
  IssueFilters,
} from "@/components/IssueFilters";
import { IssueTable } from "@/components/ui";
import { publicContacts } from "@/lib/responsibility";
export default function Issues() {
  const { state, notify } = useCivic();
  const [filters, setFilters] = useState({ ...initialFilters });
  const [sort, setSort] = useState("priority");
  const issues = filterIssues(state.issues, filters).sort((a, b) =>
    sort === "priority"
      ? b.priorityScore - a.priorityScore
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  function exportCsv() {
    const safe = (v: string | number) =>
      `"${String(v)
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`;
    const data = [
      [
        "ID",
        "Title",
        "Location",
        "Category",
        "Priority",
        "Severity",
        "Department",
        "Responsible public office",
        "Public phone",
        "Official complaint URL",
        "Reports",
        "Status",
      ],
      ...issues.map((i) => [
        i.id,
        i.title,
        i.address,
        i.category,
        i.priorityScore,
        i.severity,
        i.department,
        publicContacts[i.category].authority,
        publicContacts[i.category].phone ?? "",
        publicContacts[i.category].url,
        i.reporterCount,
        i.status,
      ]),
    ]
      .map((row) => row.map(safe).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([data], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "civicpulse-issues.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${issues.length} cases.`);
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">FROM INSIGHT TO ACTION</span>
          <h1>
            Issue management<span className="blue">.</span>
          </h1>
          <p>Review, assign and resolve the cases that matter.</p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={exportCsv}>
            <Download size={16} />
            Export CSV
          </button>
          <Link href="/report" className="button primary">
            <Plus size={16} />
            New report
          </Link>
        </div>
      </div>
      <section className="panel management-panel">
        <IssueFilters value={filters} onChange={setFilters} expanded />
        <div className="management-toolbar">
          <span>
            <strong>{issues.length}</strong> of {state.issues.length} cases
          </span>
          <label>
            Sort by
            <Select
              aria-label="Sort issues"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="priority">Highest priority</option>
              <option value="newest">Newest first</option>
            </Select>
          </label>
        </div>
        <IssueTable issues={issues} />
      </section>
    </div>
  );
}
