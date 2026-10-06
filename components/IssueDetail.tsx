"use client";
import { Select } from "@/components/Select";
import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  Camera,
  Check,
  CheckCheck,
  Copy,
  FileText,
  Fingerprint,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useCivic } from "./CivicProvider";
import { Badge, EmptyState, PriorityScore, Timeline } from "./ui";
import { IssueMap } from "./IssueMap";
import { ImageUploader } from "./ImageUploader";
import { departments } from "@/lib/departmentRouting";
import { OfficialContact } from "./OfficialContact";
import { caseLabel, caseNumber } from "@/lib/caseLabel";
import { Issue, IssueStatus, statuses } from "@/types/civic";
import {
  changeIssueStatus,
  confirmIssueFixedByCitizen,
} from "@/services/issueRepository";
import { issueImage } from "@/lib/issueImages";
import { useDialogAccessibility } from "./useDialogAccessibility";
export function IssueDetail({
  id,
  authority = false,
}: {
  id: string;
  authority?: boolean;
}) {
  const { state, ready, confirmAffected, notify } = useCivic();
  const issue = state.issues.find((i) => i.id === id);
  if (!ready)
    return (
      <div className="empty-state">
        <span className="spinner" /> Loading case…
      </div>
    );
  if (!issue)
    return (
      <div className="page">
        <EmptyState
          title="We couldn’t find this case."
          text="The case may belong to another browser or the demo may have been reset."
        />
        <Link href="/track" className="button primary">
          Find a complaint
        </Link>
      </div>
    );
  const history = state.history.filter((h) => h.issueId === id);
  const photo = issueImage(issue);
  return (
    <div className="page detail-page">
      <Link
        href={authority ? "/authority/issues" : "/track"}
        className="back-link"
      >
        <ArrowLeft size={14} />
        {authority ? "All issues" : "Track another complaint"}
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{caseLabel(issue)}</span>
          <h1>{issue.title}</h1>
          <p className="icon-text">
            <MapPin size={14} />
            {issue.address}
            {issue.ward && ` · Ward ${issue.ward}`}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(issue.id);
              notify("Case reference copied.");
            } catch {
              notify(`Tracking ID: ${issue.id}`);
            }
          }}
        >
          <Copy size={15} />
          Copy reference
        </button>
      </div>
      <div className="detail-status-strip">
        <Badge value={issue.status} />
        {issue.sourceUrl && <span>Unverified online lead</span>}
        <Badge value={issue.severity} />
        <span>
          <Users size={15} />
          {issue.sourceUrl
            ? "Public post · no citizen report filed"
            : `${issue.reporterCount} citizen reports`}
        </span>
        <span>
          <Fingerprint size={15} />
          {issue.duplicateCount} duplicates linked
        </span>
        <span>
          Reported{" "}
          {new Date(issue.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
      <OfficialContact
        category={issue.category}
        department={issue.department}
        address={issue.address}
      />
      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel case-overview">
            <div className="panel-heading">
              <h2>
                <FileText size={18} />
                The reported issue
              </h2>
              <span className="small-text muted">{caseNumber(issue.id)}</span>
            </div>
            <figure className="case-photo">
              <img
                src={photo.src}
                alt={
                  photo.illustrative
                    ? `${issue.category} illustration`
                    : `Citizen report: ${issue.title}`
                }
              />
              <figcaption>
                {photo.illustrative
                  ? "AI-generated category illustration · not a photo of this case"
                  : "Citizen report photo · submitted with this case"}
              </figcaption>
            </figure>
            <div className="case-description">
              <p>{issue.description}</p>
              <div className="case-facts">
                <div>
                  <span>Category</span>
                  <strong>{issue.category}</strong>
                </div>
                <div>
                  <span>CivicPulse routing</span>
                  <strong>{issue.department}</strong>
                </div>
              </div>
              {issue.sourceUrl && (
                <div className="public-contact">
                  <strong>Unverified lead from {issue.sourcePlatform}</strong>
                  <a
                    href={issue.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View original public post ↗
                  </a>
                  <small>
                    Approximate area marker based on the place named in the
                    post. Site verification is needed before dispatch.
                  </small>
                </div>
              )}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>
                <Sparkles size={18} className="blue" />
                Analysis & civic priority
              </h2>
              <PriorityScore
                score={issue.priorityScore}
                severity={issue.severity}
              />
            </div>
            <div className="case-analysis">
              <p>{issue.aiSummary}</p>
              <span className="analysis-source">
                {Math.round(issue.aiConfidence * 100)}%{" "}
                {issue.analysisSource === "local"
                  ? "keyword match score · Local fallback"
                  : issue.analysisSource === "ollama"
                    ? "local Ollama model confidence estimate"
                    : "provider confidence estimate"}
              </span>
              <div className="factor-list">
                {issue.factors.map((f) => (
                  <div key={f.label}>
                    <span>{f.label}</span>
                    <div className="factor-bar">
                      <i style={{ width: `${(f.value / 50) * 100}%` }} />
                    </div>
                    <strong>+{f.value}</strong>
                  </div>
                ))}
              </div>
              <small>
                AI recommendations can be reviewed by civic authorities. Civic
                Priority Score is a demo metric.
              </small>
            </div>
          </section>
          {state.reports.some((report) => report.issueId === id) && (
            <section className="panel">
              <div className="panel-heading">
                <h2>
                  <Users size={18} />
                  Linked citizen reports
                </h2>
              </div>
              <div className="linked-reports">
                {state.reports
                  .filter((report) => report.issueId === id)
                  .map((report) => (
                    <article key={report.id}>
                      <div className="between">
                        <strong className="mono">{report.id}</strong>
                        <small>
                          {new Date(report.createdAt).toLocaleDateString(
                            "en-IN",
                          )}
                        </small>
                      </div>
                      <p>{report.description}</p>
                      {report.imageUrl && (
                        <img
                          src={report.imageUrl}
                          alt="Photo attached to this linked citizen report"
                        />
                      )}
                    </article>
                  ))}
              </div>
            </section>
          )}
          <section className="panel">
            <div className="panel-heading">
              <h2>
                <MapPin size={18} />
                Issue location
              </h2>
              <Link href={`/map?issue=${id}`} className="text-link">
                Open city map
              </Link>
            </div>
            <IssueMap
              issues={[issue]}
              pick={{ latitude: issue.latitude, longitude: issue.longitude }}
              compact
            />
            <div className="case-location">
              <strong>{issue.address}</strong>
              <span>
                {issue.locationApproximate
                  ? "Approximate area centre · verify exact location"
                  : `${issue.latitude.toFixed(5)}, ${issue.longitude.toFixed(5)}`}
              </span>
            </div>
          </section>
          {(issue.status === "Resolved" ||
            issue.resolutionImageUrl ||
            issue.citizenResolutionImageUrl) && (
            <section className="panel resolution-card">
              <div className="panel-heading">
                <h2>
                  <CheckCheck size={20} />
                  {issue.status === "Resolved"
                    ? "Resolution evidence"
                    : "Fix awaiting both photos"}
                </h2>
              </div>
              <div className="case-description">
                {issue.demoResolutionEvidence && (
                  <p className="demo-evidence-label">
                    AI-generated demo after-images · fictional example, not real
                    citizen or authority uploads
                  </p>
                )}
                <p>
                  {issue.resolutionNote ||
                    (issue.status === "Resolved"
                      ? "This case was marked resolved before the two-photo verification flow."
                      : "A fix has been reported. Both sides need to upload a current photo before this case is resolved.")}
                </p>
                {issue.status === "Resolved" && (
                  <small>
                    Resolved{" "}
                    {issue.resolvedAt
                      ? new Date(issue.resolvedAt).toLocaleString("en-IN")
                      : ""}
                  </small>
                )}
                <div className="resolution-evidence-grid">
                  <div>
                    <strong>Authority after-photo</strong>
                    {issue.resolutionImageUrl ? (
                      <img
                        className="resolution-photo"
                        src={issue.resolutionImageUrl}
                        alt="Authority photo after work"
                      />
                    ) : (
                      <small>Waiting for authority photo</small>
                    )}
                  </div>
                  <div>
                    <strong>Citizen confirmation photo</strong>
                    {issue.citizenResolutionImageUrl ? (
                      <img
                        className="resolution-photo"
                        src={issue.citizenResolutionImageUrl}
                        alt="Citizen photo confirming the fix"
                      />
                    ) : (
                      <small>Waiting for citizen photo</small>
                    )}
                  </div>
                </div>
                {issue.citizenResolutionNote && (
                  <p>Citizen note: {issue.citizenResolutionNote}</p>
                )}
              </div>
            </section>
          )}
        </div>
        <aside className="detail-aside">
          <section className="panel">
            <div className="panel-heading">
              <h2>
                <Activity size={18} />
                Journey to resolution
              </h2>
            </div>
            <Timeline history={history} status={issue.status} />
          </section>
          <section className="community-case">
            <Users size={25} />
            <h3>Does this affect you too?</h3>
            <p>
              Help city teams understand the impact without creating another
              case.
            </p>
            <strong>
              {issue.communityConfirmations} community confirmations
            </strong>
            <button
              className="button secondary"
              disabled={
                state.confirmations.includes(id) || issue.status === "Resolved"
              }
              onClick={() => confirmAffected(id)}
            >
              {state.confirmations.includes(id) ? (
                <>
                  <Check size={16} />
                  You’ve confirmed
                </>
              ) : issue.status === "Resolved" ? (
                "This issue is resolved"
              ) : (
                <>I’m affected too</>
              )}
            </button>
            <small>One confirmation per browser.</small>
          </section>
          {!authority && issue.status !== "Resolved" && (
            <CitizenResolutionControls
              key={`${issue.id}-${issue.updatedAt}`}
              issue={issue}
            />
          )}
          {authority ? (
            <AuthorityControls
              key={`${issue.id}-${issue.updatedAt}`}
              issue={issue}
            />
          ) : (
            <div className="authority-access">
              <ShieldCheck size={20} />
              <div>
                <strong>Working with the city team?</strong>
                <p>Review and update this case in the authority workspace.</p>
              </div>
              <Link className="text-link" href={`/authority/issues/${id}`}>
                Open authority view
              </Link>
              <small>Simulated access for the hackathon demo.</small>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
function CitizenResolutionControls({ issue }: { issue: Issue }) {
  const { state, commit, notify } = useCivic();
  const [photo, setPhoto] = useState<string>();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  if (issue.citizenResolutionImageUrl) {
    return (
      <section className="panel citizen-resolution">
        <h2>Your fix confirmation is recorded</h2>
        <p>
          {issue.resolutionImageUrl
            ? "Both photos are in, and this case is resolved."
            : "The case will be resolved when the authority uploads its after-photo."}
        </p>
        <small>
          Demo: one confirmation per case and browser, with no identity
          verification.
        </small>
      </section>
    );
  }
  return (
    <section className="panel citizen-resolution">
      <div className="panel-heading">
        <h2>
          <Camera size={18} /> Confirm the issue is fixed
        </h2>
      </div>
      <form
        className="case-description"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const next = confirmIssueFixedByCitizen(
              state,
              issue.id,
              photo || "",
              note.trim(),
            );
            if (commit(next))
              notify(
                next.issues.find((item) => item.id === issue.id)?.status ===
                  "Resolved"
                  ? "Case resolved with both photos."
                  : "Your photo is recorded. Waiting for the authority after-photo.",
              );
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "Could not save your confirmation.",
            );
          }
        }}
      >
        <p>
          Has the problem been fixed? Upload a current photo of the site. This
          is required even if the authority has already posted an after-photo.
        </p>
        <ImageUploader
          value={photo}
          onChange={(value) => {
            setPhoto(value);
            setError("");
          }}
          label="Upload citizen confirmation photo"
        />
        <label htmlFor="citizen-fix-note">
          What was fixed? <span className="optional">Optional</span>
        </label>
        <textarea
          id="citizen-fix-note"
          value={note}
          maxLength={1000}
          onChange={(event) => setNote(event.target.value)}
          placeholder="For example, the trash was removed and the street is clear."
        />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" type="submit" disabled={!photo}>
          Confirm fix with photo
        </button>
        <small>
          Demo confirmation is available to anyone with this case link; real
          deployment needs verified citizen accounts.
        </small>
      </form>
    </section>
  );
}
function AuthorityControls({ issue }: { issue: Issue }) {
  const { state, commit, notify } = useCivic();
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [department, setDepartment] = useState(issue.department);
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState("");
  const [image, setImage] = useState(issue.resolutionImageUrl);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  useDialogAccessibility(confirm, () => setConfirm(false));
  const notes = state.notes.filter((n) => n.issueId === issue.id);
  function save() {
    try {
      const next = changeIssueStatus(
        state,
        issue.id,
        status,
        note.trim(),
        department,
        image,
      );
      if (commit(next)) {
        const actual = next.issues.find((item) => item.id === issue.id)?.status;
        notify(
          status === "Resolved" && actual !== "Resolved"
            ? "Authority photo saved. Waiting for a citizen confirmation photo."
            : `Case updated to ${actual}.`,
        );
        setConfirm(false);
        setNote("");
        setError("");
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save this update.",
      );
    }
  }
  return (
    <>
      <section className="panel authority-controls">
        <div className="panel-heading">
          <h2>
            <ShieldCheck size={18} />
            Manage this case
          </h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (status === "Resolved" && !image) {
              setError("Upload an after-photo before requesting resolution.");
              return;
            }
            if (status === "Resolved" && issue.status !== "Resolved")
              setConfirm(true);
            else save();
          }}
        >
          <div className="field">
            <label htmlFor="department">Responsible department</label>
            <Select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label htmlFor="status">Case status</label>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as IssueStatus)}
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div className="field">
            <label htmlFor="status-note">
              {status === "Resolved"
                ? "Resolution note"
                : "Public progress update"}{" "}
              <span className="optional">Optional</span>
            </label>
            <textarea
              id="status-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder={
                status === "Resolved"
                  ? "Describe the work completed…"
                  : "What should the community know?"
              }
            />
          </div>
          {status === "Resolved" && issue.status !== "Resolved" && (
            <div className="field">
              <label>
                Authority after-photo <span className="required">Required</span>
              </label>
              <ImageUploader
                value={image}
                onChange={setImage}
                label="Upload authority after-photo"
              />
            </div>
          )}
          {status === "Resolved" && issue.status === "Resolved" && (
            <p className="field-hint">
              Reopen this case before replacing its resolution photos.
            </p>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" type="submit">
            Save case update
          </button>
        </form>
      </section>
      <section className="panel internal-notes">
        <div className="panel-heading">
          <h2>
            <MessageSquare size={17} />
            Internal notes
          </h2>
        </div>
        <div className="notes-content">
          {notes.length ? (
            notes.map((n) => (
              <div className="internal-note" key={n.id}>
                <p>{n.text}</p>
                <small>{new Date(n.timestamp).toLocaleString("en-IN")}</small>
              </div>
            ))
          ) : (
            <p className="muted small-text">No team notes yet.</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!internal.trim()) return;
              if (
                commit({
                  ...state,
                  notes: [
                    ...state.notes,
                    {
                      id: crypto.randomUUID(),
                      issueId: issue.id,
                      text: internal.trim(),
                      timestamp: new Date().toISOString(),
                    },
                  ],
                })
              ) {
                setInternal("");
                notify("Team note added.");
              }
            }}
          >
            <label htmlFor="internal-note" className="sr-only">
              Internal note
            </label>
            <textarea
              id="internal-note"
              placeholder="Add context for the field team…"
              value={internal}
              onChange={(e) => setInternal(e.target.value)}
              maxLength={2000}
            />
            <button
              className="button secondary small"
              disabled={!internal.trim()}
            >
              Add note
            </button>
          </form>
          <small>
            Demo visibility only; real access control is not enabled.
          </small>
        </div>
      </section>
      {confirm && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resolve-title"
          >
            <h2 id="resolve-title">Submit the authority after-photo?</h2>
            <p>
              The case reaches Resolved only after a citizen also uploads a
              photo confirming the fix.
            </p>
            <div className="button-row">
              <button
                autoFocus
                className="button secondary"
                onClick={() => setConfirm(false)}
              >
                Keep editing
              </button>
              <button className="button primary" onClick={save}>
                <CheckCheck size={16} />
                Submit after-photo
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
