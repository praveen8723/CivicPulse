"use client";
import { Select } from "@/components/Select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Issue, categories, statuses } from "@/types/civic";
import { departments } from "@/lib/departmentRouting";
export interface Filters {
  search: string;
  category: string;
  severity: string;
  status: string;
  department: string;
  ward: string;
  date: string;
  unresolved: boolean;
}
export const initialFilters: Filters = {
  search: "",
  category: "",
  severity: "",
  status: "",
  department: "",
  ward: "",
  date: "",
  unresolved: false,
};
export function filterIssues(issues: Issue[], f: Filters) {
  return issues.filter(
    (i) =>
      (!f.search ||
        `${i.id} ${i.description} ${i.address} ${i.title}`
          .toLowerCase()
          .includes(f.search.toLowerCase())) &&
      (!f.category || i.category === f.category) &&
      (!f.severity || i.severity === f.severity) &&
      (!f.status || i.status === f.status) &&
      (!f.department || i.department === f.department) &&
      (!f.ward ||
        i.ward.includes(f.ward) ||
        i.address.toLowerCase().includes(f.ward.toLowerCase())) &&
      (!f.date || i.createdAt.slice(0, 10) >= f.date) &&
      (!f.unresolved || i.status !== "Resolved"),
  );
}
export function IssueFilters({
  value,
  onChange,
  expanded = false,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  expanded?: boolean;
}) {
  const set = (key: keyof Filters, v: string | boolean) =>
    onChange({ ...value, [key]: v });
  return (
    <div className="filters">
      <div className="search-field">
        <Search size={17} />
        <input
          aria-label="Search issues"
          placeholder="Search by ID, issue or location…"
          value={value.search}
          onChange={(e) => set("search", e.target.value)}
        />
      </div>
      <div className="filter-controls">
        <SlidersHorizontal size={16} />
        <Select
          aria-label="Category filter"
          value={value.category}
          onChange={(e) => set("category", e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Select
          aria-label="Severity filter"
          value={value.severity}
          onChange={(e) => set("severity", e.target.value)}
        >
          <option value="">All severities</option>
          {["Low", "Medium", "High", "Critical"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select
          aria-label="Status filter"
          value={value.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        {expanded && (
          <>
            <Select
              aria-label="Department filter"
              value={value.department}
              onChange={(e) => set("department", e.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
            <input
              aria-label="Ward or location filter"
              placeholder="Ward or location"
              value={value.ward}
              onChange={(e) => set("ward", e.target.value)}
            />
            <label className="date-filter">
              Since
              <input
                aria-label="Reported since"
                type="date"
                value={value.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </label>
          </>
        )}
        <button
          className="text-button clear-filters"
          onClick={() => onChange({ ...initialFilters })}
        >
          <X size={13} />
          Clear
        </button>
      </div>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={value.unresolved}
          onChange={(e) => set("unresolved", e.target.checked)}
        />
        Show unresolved only
      </label>
    </div>
  );
}
