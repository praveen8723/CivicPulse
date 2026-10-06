"use client";
import { Select } from "@/components/Select";
import Link from "next/link";
import { caseNumber } from "@/lib/caseLabel";
import { issueImage } from "@/lib/issueImages";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CheckCheck,
  ChevronRight,
  CircleDot,
  Fingerprint,
  Focus,
  Layers,
  MapPin,
  Maximize2,
  Pause,
  Play,
  Plus,
  Radio,
  ScanLine,
  Shield,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { useCivic } from "./CivicProvider";
import { IssueMap } from "./IssueMap";
import { Badge, IssueCard, IssueTable } from "./ui";
import { AnimatedNumber } from "./AnimatedNumber";
import { useCityTour } from "./useCityTour";
import { departments } from "@/lib/departmentRouting";
export function ControlRoom({ authority = false }: { authority?: boolean }) {
  const { state } = useCivic();
  const [manualSelection, setSelection] = useState("");
  const tour = useCityTour(state.issues);
  const selection = tour.running && tour.stop ? tour.stop.id : manualSelection;
  function pauseTour() {
    if (tour.running && tour.stop) setSelection(tour.stop.id);
    tour.pause();
  }
  function startTour() {
    setView("city");
    setScope("Active");
    setHeatmap(false);
    tour.start();
  }
  const [view, setView] = useState<"city" | "overview">("city");
  const [heatmap, setHeatmap] = useState(false);
  const [scope, setScope] = useState("Active");
  const [queue, setQueue] = useState("All priorities");
  const active = state.issues.filter((i) => i.status !== "Resolved"),
    resolved = state.issues.filter((i) => i.status === "Resolved");
  const critical = active.filter((i) => i.severity === "Critical");
  const reports = state.issues.reduce((s, i) => s + i.reporterCount, 0),
    merged = state.issues.reduce((s, i) => s + i.duplicateCount, 0);
  const priority = [...active].sort(
    (a, b) => b.priorityScore - a.priorityScore,
  );
  const selected =
    state.issues.find((i) => i.id === (selection || "CP-2026-0892")) ??
    priority[0];
  const visible = useMemo(
    () =>
      scope === "Critical"
        ? state.issues.filter(
            (i) => i.status !== "Resolved" && i.severity === "Critical",
          )
        : scope === "Active"
          ? state.issues.filter((i) => i.status !== "Resolved")
          : state.issues,
    [scope, state.issues],
  );
  const mine = state.issues.filter((i) =>
    state.reports.some((r) => r.issueId === i.id),
  );
  const history = state.history.filter((h) => h.issueId === selected.id);
  const workload = departments
    .map((name) => ({
      name,
      count: active.filter((i) => i.department === name).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const trend = Array.from({ length: 14 }, (_, j) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - j));
    const end = date.getTime() + 86400000;
    return {
      date: date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      reported: state.issues.filter(
        (i) =>
          new Date(i.createdAt).getTime() >= date.getTime() &&
          new Date(i.createdAt).getTime() < end,
      ).length,
      resolved: resolved.filter(
        (i) =>
          i.resolvedAt &&
          new Date(i.resolvedAt).getTime() >= date.getTime() &&
          new Date(i.resolvedAt).getTime() < end,
      ).length,
    };
  });
  const resolution = Math.round((resolved.length / state.issues.length) * 100);
  return (
    <div
      className={`control-room ${authority ? "authority-room" : "citizen-room"}`}
    >
      <div className="room-heading">
        <div>
          <span className="system-label">
            <span />
            BENGALURU / {authority ? "CITY OPERATIONS" : "YOUR NEIGHBOURHOOD"}
          </span>
          <h1>
            {authority ? "A pulse on your city." : "Your city. In focus."}
          </h1>
          <p>
            {authority
              ? "Review urgent issues, assign work, and keep residents updated."
              : "See local issues, report a problem, and follow the progress."}
          </p>
        </div>
        <div className="room-heading-actions">
          <span className="room-date">
            {new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
          <Link className="button primary" href="/report">
            <Plus size={17} />
            Report an issue
          </Link>
        </div>
      </div>
      <section className="telemetry-strip" aria-label="City metrics">
        {[
          {
            label: "Active cases",
            value: active.length,
            caption: "Waiting for a resolution",
            icon: Activity,
            tone: "cyan",
          },
          {
            label: "Urgent issues",
            value: critical.length,
            caption: "Need attention first",
            icon: Radio,
            tone: "coral",
          },
          {
            label: "Citizen reports",
            value: reports,
            caption: `${merged} related reports combined`,
            icon: Users,
            tone: "sand",
          },
          {
            label: "Cases resolved",
            value: resolved.length,
            caption: `${resolution}% of all reported issues`,
            icon: CheckCheck,
            tone: "mint",
          },
        ].map((m, j) => (
          <div className={`telemetry-metric tone-${m.tone}`} key={m.label}>
            <div className="metric-caption">
              <m.icon size={15} />
              {m.label}
              <span>0{j + 1}</span>
            </div>
            <div className="telemetry-value">
              <strong>
                <AnimatedNumber value={m.value} pad={2} />
              </strong>
              <span className="micro-bars" aria-hidden="true">
                {Array.from({ length: 12 }, (_, i) => (
                  <i
                    key={i}
                    style={{
                      height: `${12 + ((i * 7 + j * 9) % 26)}px`,
                      opacity: 0.2 + i * 0.065,
                      animationDelay: `${j * 100 + i * 45}ms`,
                    }}
                  />
                ))}
              </span>
            </div>
            <small>{m.caption}</small>
          </div>
        ))}
      </section>
      <section
        className={`intelligence-stage ${tour.running ? "tour-running" : ""}`}
        aria-label="City situational overview"
      >
        <div className="stage-map">
          <IssueMap
            issues={visible}
            selected={selection}
            onSelect={(id) => {
              tour.pause();
              setSelection(id);
              setView("city");
            }}
            view={view}
            heatmap={heatmap}
            onUserInteract={pauseTour}
          />
        </div>
        <div className="stage-top">
          <div className="stage-heading">
            <span className="stage-cross">
              <ScanLine size={17} />
            </span>
            <div>
              <strong>Your neighbourhood at a glance</strong>
              <small>
                {view === "overview"
                  ? "NEIGHBOURHOOD HOTSPOTS"
                  : "BENGALURU METROPOLITAN AREA"}
              </small>
            </div>
          </div>
          <div className="scene-switch" aria-label="Map perspective">
            <button
              aria-pressed={view === "city"}
              className={view === "city" ? "active" : ""}
              onClick={() => {
                pauseTour();
                setView("city");
                setHeatmap(false);
                setSelection("");
              }}
            >
              <Layers size={14} />
              City
            </button>
            <button
              aria-pressed={view === "overview"}
              className={view === "overview" ? "active" : ""}
              onClick={() => {
                tour.pause();
                setHeatmap(true);
                setSelection("");
                setView("overview");
              }}
            >
              <Focus size={14} />
              Hotspots
            </button>
          </div>
          <Link
            href="/map"
            className="stage-expand"
            aria-label="Expand city map"
          >
            <Maximize2 size={17} />
          </Link>
        </div>
        <aside className="signal-panel">
          <div className="signal-panel-title">
            <span className="live-dot" />
            <strong>Needs attention</strong>
            <span>{visible.length}</span>
          </div>
          <div className="signal-tabs">
            {["Active", "Critical", "All"].map((s) => (
              <button
                key={s}
                aria-pressed={scope === s}
                className={scope === s ? "active" : ""}
                onClick={() => {
                  pauseTour();
                  setScope(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="signal-list">
            {[...visible]
              .sort((a, b) => b.priorityScore - a.priorityScore)
              .slice(0, 4)
              .map((issue) => (
                <button
                  key={issue.id}
                  className={selection === issue.id ? "active" : ""}
                  onClick={() => {
                    tour.pause();
                    setSelection(issue.id);
                    setView("city");
                  }}
                >
                  <span
                    className={`signal-severity ${issue.severity.toLowerCase()}`}
                  />
                  <div>
                    <span className="signal-id">{caseNumber(issue.id)}</span>
                    <strong>{issue.title}</strong>
                    <small>{issue.address.split(",")[0]}</small>
                  </div>
                  <span className="signal-score">
                    {issue.priorityScore}
                    <ChevronRight size={12} />
                  </span>
                </button>
              ))}
          </div>
          <Link
            href={authority ? "/authority/issues" : "/map"}
            className="signal-all"
          >
            Explore all cases <ArrowUpRight size={14} />
          </Link>
        </aside>
        <aside className="case-float" key={selected.id} onFocus={pauseTour}>
          <div className="case-float-top">
            <span>SELECTED CASE</span>
            <Badge value={selected.severity} />
          </div>
          <div className="case-float-visual">
            <img src={issueImage(selected).src} alt={selected.title} />
            {!selected.imageUrl && (
              <span className="visual-demo-label">
                AI-GENERATED ILLUSTRATION
              </span>
            )}
            <span className="visual-id">{caseNumber(selected.id)}</span>
            <span className="visual-type">{selected.category}</span>
          </div>
          <div className="case-float-body">
            <h2>{selected.title}</h2>
            <p>
              <MapPin size={12} />
              {selected.address}
            </p>
            <div className="case-float-numbers">
              <div>
                <span>PRIORITY</span>
                <strong>
                  {selected.priorityScore}
                  <small>/100</small>
                </strong>
              </div>
              <div>
                <span>REPORTS</span>
                <strong>
                  {selected.reporterCount.toString().padStart(2, "0")}
                  <Users size={13} />
                </strong>
              </div>
            </div>
            <div className="case-float-status">
              <Badge value={selected.status} />
              <span>{history.length} updates</span>
            </div>
            <Link
              className="case-open"
              href={`${authority ? "/authority/issues" : "/track"}/${selected.id}`}
            >
              {authority ? "Review case" : "Track this case"}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </aside>
        <div className="stage-bottom">
          <div className="stage-legend">
            {["Critical", "High", "Medium", "Low"].map((s) => (
              <span key={s}>
                <i className={`legend-${s.toLowerCase()}`} />
                {s}
              </span>
            ))}
          </div>
          <div className="stage-layer-switch">
            <button
              aria-pressed={!heatmap}
              className={!heatmap ? "active" : ""}
              onClick={() => {
                pauseTour();
                setHeatmap(false);
              }}
            >
              <CircleDot size={14} />
              Issues
            </button>
            <button
              aria-pressed={heatmap}
              className={heatmap ? "active" : ""}
              onClick={() => {
                pauseTour();
                setHeatmap(true);
              }}
            >
              <Layers size={14} />
              Heatmap
            </button>
          </div>
          <button
            className={`orbit-button ${tour.running ? "active" : ""}`}
            onClick={() => (tour.running ? pauseTour() : startTour())}
            aria-pressed={tour.running}
            aria-label={tour.running ? "Pause city tour" : "Start city tour"}
          >
            {tour.running ? <Pause size={14} /> : <Play size={14} />}
            <span>{tour.running ? "Pause tour" : "City tour"}</span>
          </button>
        </div>
        <div className={`tour-caption ${tour.running ? "playing" : ""}`}>
          <span className="tour-eyebrow">
            <span className="live-dot" />
            {tour.running
              ? `CITY TOUR / 0${tour.index + 1} OF 0${tour.stops.length}`
              : "BENGALURU / PRIORITY ROUTE"}
          </span>
          <strong>
            {tour.running && tour.stop
              ? tour.stop.address.split(",")[0]
              : "Every neighbourhood. In focus."}
          </strong>
          <span className="tour-description">
            {tour.running
              ? "Following the cases that need attention."
              : "Take a guided flight through the city’s priority cases."}
          </span>
          {tour.running ? (
            <>
              <div className="tour-progress" key={tour.index}>
                <span />
              </div>
              <button aria-label="Next tour stop" onClick={tour.next}>
                Next stop <ChevronRight size={12} />
              </button>
            </>
          ) : (
            <button onClick={startTour}>
              Explore the city <ArrowUpRight size={13} />
            </button>
          )}
        </div>
        <div className="map-coordinate-label">
          12°58′17.8″N
          <br />
          77°35′40.6″E
        </div>
      </section>
      <details className="city-insights" open={authority ? true : undefined}>
        <summary>
          City progress & department activity <ChevronRight size={16} />
        </summary>
        <div className="room-analytics">
          <section className="console-panel response-panel">
            <div className="console-panel-head">
              <span>
                <Activity size={15} />
                REPORTS & RESPONSE
              </span>
              <span>14D</span>
            </div>
            <div className="response-title">
              <h2>Reports over the last 14 days</h2>
              <div>
                <span>
                  <i />
                  Reported
                </span>
                <span>
                  <i />
                  Resolved
                </span>
              </div>
            </div>
            <div className="response-chart">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart
                  data={trend}
                  margin={{ top: 10, left: 0, right: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="response-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#8BBCE8" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#8BBCE8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="#ffffff08"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9AAFBF", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#18232b",
                      border: "1px solid #35454e",
                      borderRadius: 8,
                      color: "#d7e0e5",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="reported"
                    stroke="#8BBCE8"
                    strokeWidth={1.7}
                    fill="url(#response-fill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stroke="#68C7AC"
                    strokeWidth={1.4}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="console-panel workload-console">
            <div className="console-panel-head">
              <span>
                <Shield size={15} />
                WORK BY DEPARTMENT
              </span>
              <ArrowUpRight size={15} />
            </div>
            <h2>Where work is happening.</h2>
            <div className="workload-rows">
              {workload.map((d) => (
                <div key={d.name}>
                  <span>{d.name}</span>
                  <span className="block-meter" aria-hidden="true">
                    {Array.from({ length: 16 }, (_, j) => (
                      <i
                        key={j}
                        className={
                          j < (d.count / Math.max(workload[0].count, 1)) * 16
                            ? "on"
                            : ""
                        }
                      />
                    ))}
                  </span>
                  <strong>{d.count.toString().padStart(2, "0")}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="console-panel impact-console">
            <div className="console-panel-head">
              <span>
                <Fingerprint size={15} />
                COLLECTIVE IMPACT
              </span>
              <span>BLR</span>
            </div>
            <div className="impact-console-body">
              <div
                className="resolution-ring"
                style={
                  {
                    "--progress": `${resolution * 3.6}deg`,
                  } as React.CSSProperties
                }
              >
                <div>
                  <strong>
                    {resolution}
                    <small>%</small>
                  </strong>
                  <span>RESOLVED</span>
                </div>
              </div>
              <div>
                <strong>
                  <AnimatedNumber value={merged} />
                </strong>
                <p>
                  duplicate reports.
                  <br />
                  One clearer picture.
                </p>
                <span>
                  <span className="live-dot" />
                  Every voice counts
                </span>
              </div>
            </div>
          </section>
        </div>
      </details>
      {authority ? (
        <section className="console-panel room-queue">
          <div className="console-panel-head">
            <span>
              <Radio size={15} />
              PRIORITY QUEUE
            </span>
            <div>
              <Select
                aria-label="Filter priority queue"
                value={queue}
                onChange={(e) => setQueue(e.target.value)}
              >
                <option>All priorities</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </Select>
              <Link href="/authority/issues">
                All cases <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
          <IssueTable
            issues={priority
              .filter((i) => queue === "All priorities" || i.severity === queue)
              .slice(0, 6)}
          />
        </section>
      ) : (
        <section className="community-reports">
          <div className="community-reports-heading">
            <div>
              <span className="system-label">YOUR CONNECTION TO THE CITY</span>
              <h2>
                {mine.length
                  ? "Your reports. Their progress."
                  : "Follow the change on your street."}
              </h2>
            </div>
            <Link href="/track">
              Track a complaint <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="issue-card-grid">
            {(mine.length
              ? mine
              : [selected, ...priority.filter((i) => i.id !== selected.id)]
            )
              .slice(0, 3)
              .map((i) => (
                <IssueCard key={i.id} issue={i} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
