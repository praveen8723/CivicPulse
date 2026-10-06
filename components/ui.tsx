import Link from "next/link";
import {
  ArrowUpRight,
  MapPin,
  Users,
  SearchX,
  Check,
  Clock3,
  Circle,
} from "lucide-react";
import { Issue, IssueStatusHistory, Severity, statuses } from "@/types/civic";
import { caseNumber } from "@/lib/caseLabel";
import { publicContacts, suggestedTrafficStation } from "@/lib/responsibility";
import { issueImage } from "@/lib/issueImages";
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value.toLowerCase().replaceAll(" ", "-")}`}>
      <span />
      {value}
    </span>
  );
}
export function PriorityScore({
  score,
  severity,
}: {
  score: number;
  severity?: Severity;
}) {
  return (
    <span
      className={`score ${severity?.toLowerCase() ?? ""}`}
      title="CivicPulse demo score: urgency, safety, community reports and response time. Not an official government metric."
    >
      {score}
      <small>/100</small>
    </span>
  );
}
export function EmptyState({
  title = "No issues match these filters.",
  text = "Try a different search or clear your filters.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty-state">
      <SearchX size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function IssueCard({ issue }: { issue: Issue }) {
  const contact = publicContacts[issue.category];
  const trafficStation =
    issue.category === "Traffic Signal" ||
    issue.category === "Traffic / Congestion"
      ? suggestedTrafficStation(issue.address)
      : undefined;
  return (
    <Link href={`/track/${issue.id}`} className="issue-card">
      <div className="issue-card-photo">
        <img
          src={issueImage(issue).src}
          alt={
            issueImage(issue).illustrative
              ? `${issue.category} illustration`
              : `Photo of ${issue.title}`
          }
        />
        <span>
          {issueImage(issue).illustrative ? "Illustration" : "Report photo"}
        </span>
      </div>
      <div className="between">
        <span className="muted">{caseNumber(issue.id)}</span>
        <Badge value={issue.severity} />
      </div>
      <h3>{issue.title}</h3>
      <p className="icon-text">
        <MapPin size={14} />
        {issue.address}
      </p>
      <p className="issue-card-contact">
        Responsible office: {contact.authority}
        {trafficStation
          ? ` · ${trafficStation.name} ${trafficStation.phone}`
          : contact.phone
            ? ` · ${contact.phone}`
            : ""}
      </p>
      <div className="progress-track">
        {statuses.map((s, i) => (
          <span
            key={s}
            className={i <= statuses.indexOf(issue.status) ? "complete" : ""}
          />
        ))}
      </div>
      <div className="between">
        <Badge value={issue.status} />
        <span className="small-text muted">
          <Users size={14} />{" "}
          {issue.sourceUrl ? "Online lead" : `${issue.reporterCount} reports`}
        </span>
      </div>
    </Link>
  );
}
export function Timeline({
  history,
  status,
}: {
  history: IssueStatusHistory[];
  status: Issue["status"];
}) {
  const current = statuses.indexOf(status);
  return (
    <ol className="timeline">
      {statuses.map((s, i) => {
        const event = history.filter((h) => h.status === s).at(-1);
        return (
          <li key={s} className={i <= current ? "done" : ""}>
            <span className="timeline-icon">
              {i < current ? (
                <Check size={15} />
              ) : i === current ? (
                <Clock3 size={15} />
              ) : (
                <Circle size={13} />
              )}
            </span>
            <div>
              <strong>{s}</strong>
              <small>
                {event
                  ? new Date(event.timestamp).toLocaleString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Pending"}
              </small>
              <p>{event?.note ?? "Awaiting the next update."}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
export function IssueTable({
  issues,
  authority = true,
}: {
  issues: Issue[];
  authority?: boolean;
}) {
  if (!issues.length) return <EmptyState />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Issue / location</th>
            <th>Severity</th>
            <th>Reports</th>
            <th>Responsible public office / contact</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id}>
              <td>
                <PriorityScore
                  score={issue.priorityScore}
                  severity={issue.severity}
                />
              </td>
              <td>
                <span className="table-photo">
                  <img src={issueImage(issue).src} alt="" />
                  <small>
                    {issueImage(issue).illustrative
                      ? "Illustration"
                      : "Report photo"}
                  </small>
                </span>
                <Link
                  className="table-title"
                  href={`${authority ? "/authority/issues" : "/track"}/${issue.id}`}
                >
                  {issue.title}
                </Link>
                <span className="table-sub">
                  {caseNumber(issue.id)} · {issue.address}
                  {issue.locationApproximate
                    ? " · unverified approximate area"
                    : ""}
                </span>
              </td>
              <td>
                <Badge value={issue.severity} />
              </td>
              <td>
                <span className="icon-text">
                  <Users size={14} />
                  {issue.sourceUrl ? "Online lead" : issue.reporterCount}
                </span>
              </td>
              <td>
                <strong className="department-cell">
                  {publicContacts[issue.category].authority}
                </strong>
                <small className="table-sub">
                  {publicContacts[issue.category].team}
                </small>
                <div className="table-contact-actions">
                  {(issue.category === "Traffic Signal" ||
                    issue.category === "Traffic / Congestion") &&
                    suggestedTrafficStation(issue.address) && (
                      <a
                        href={`tel:${suggestedTrafficStation(issue.address)!.phone}`}
                      >
                        {suggestedTrafficStation(issue.address)!.name}:{" "}
                        {suggestedTrafficStation(issue.address)!.phone}
                      </a>
                    )}
                  {publicContacts[issue.category].phone && (
                    <a href={`tel:${publicContacts[issue.category].phone}`}>
                      Call {publicContacts[issue.category].phone}
                    </a>
                  )}
                  <a
                    href={publicContacts[issue.category].url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Official site ↗
                  </a>
                </div>
                <small className="table-sub">
                  {Math.max(
                    0,
                    Math.floor(
                      (new Date().getTime() -
                        new Date(issue.createdAt).getTime()) /
                        3600000,
                    ),
                  )}
                  h open
                </small>
              </td>
              <td>
                <Badge value={issue.status} />
              </td>
              <td>
                <Link
                  aria-label={`View ${issue.id}`}
                  href={`${authority ? "/authority/issues" : "/track"}/${issue.id}`}
                  className="icon-button"
                >
                  <ArrowUpRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
