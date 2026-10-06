"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Layers3, MapPin, Plus, Users } from "lucide-react";
import { useCivic } from "./CivicProvider";
import { IssueMap } from "./IssueMap";
import { filterIssues, initialFilters, IssueFilters } from "./IssueFilters";
import { Badge, EmptyState, PriorityScore } from "./ui";
import { caseNumber } from "@/lib/caseLabel";
import { issueImage } from "@/lib/issueImages";
export function CityMapPage() {
  const { state } = useCivic();
  const params = useSearchParams();
  const [filters, setFilters] = useState({
    ...initialFilters,
    search: params.get("area") ?? "",
  });
  const [selected, setSelected] = useState(params.get("issue") ?? "");
  const [heatmap, setHeatmap] = useState(false);
  const issues = filterIssues(state.issues, filters).sort(
    (a, b) => b.priorityScore - a.priorityScore,
  );
  return (
    <div className="page map-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">GEOSPATIAL INTELLIGENCE / BENGALURU</span>
          <h1>The city, in every dimension.</h1>
          <p>Explore the signals. Find the patterns. Focus the response.</p>
        </div>
        <Link href="/report" className="button primary">
          <Plus size={17} />
          Report an issue
        </Link>
      </div>
      <section className="panel map-workspace">
        <IssueFilters value={filters} onChange={setFilters} />
        <div className="map-workspace-toolbar">
          <span>
            <strong>{issues.length}</strong> cases on the map
          </span>
          <div className="explorer-controls">
            <div className="segment">
              <button
                className={!heatmap ? "selected" : ""}
                onClick={() => setHeatmap(false)}
              >
                <MapPin size={13} />
                Markers
              </button>
              <button
                className={heatmap ? "selected" : ""}
                onClick={() => setHeatmap(true)}
              >
                <Layers3 size={13} />
                Heatmap
              </button>
            </div>
          </div>
        </div>
        <div className="map-explorer">
          <aside className="map-list">
            {issues.length ? (
              issues.map((i) => (
                <article
                  key={i.id}
                  className={`map-list-item ${selected === i.id ? "selected" : ""}`}
                >
                  <button
                    className="map-list-select"
                    onClick={() => {
                      setSelected(i.id);
                    }}
                  >
                    <div className="map-list-photo">
                      <img src={issueImage(i).src} alt="" />
                      <small>
                        {issueImage(i).illustrative
                          ? "Illustration"
                          : "Report photo"}
                      </small>
                    </div>
                    <div className="between">
                      <span>
                        {caseNumber(i.id)}
                        {i.locationApproximate ? " · approximate area" : ""}
                      </span>
                      <PriorityScore
                        score={i.priorityScore}
                        severity={i.severity}
                      />
                    </div>
                    <h3>{i.title}</h3>
                    <p>
                      <MapPin size={12} />
                      {i.address}
                    </p>
                    <div className="between">
                      <Badge value={i.severity} />
                      <span>
                        <Users size={12} />
                        {i.reporterCount}
                      </span>
                    </div>
                  </button>
                  <Link href={`/track/${i.id}`} className="map-details-link">
                    View case details
                  </Link>
                </article>
              ))
            ) : (
              <EmptyState />
            )}
          </aside>
          <IssueMap
            issues={issues}
            selected={selected}
            onSelect={(id) => {
              setSelected(id);
            }}
            heatmap={heatmap}
          />
        </div>
        <div className="map-footer">
          <div className="legend">
            {["Critical", "High", "Medium", "Low", "Resolved"].map((s) => (
              <span key={s}>
                <i className={`legend-${s.toLowerCase()}`} />
                {s}
              </span>
            ))}
          </div>
          <span className="small-text muted">
            {heatmap
              ? "Hover or tap a hotspot for nearby case details"
              : "Report totals combine nearby cases · Click a total to zoom in and separate issue types"}
          </span>
        </div>
      </section>
    </div>
  );
}
