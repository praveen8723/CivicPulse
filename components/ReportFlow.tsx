"use client";
import { Select } from "@/components/Select";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Check,
  CheckCheck,
  ChevronLeft,
  CircleHelp,
  FileText,
  Fingerprint,
  LocateFixed,
  MapPin,
  Mic,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Analysis } from "@/types/civic";
import { locations } from "@/lib/demoData";
import { findNearbyDuplicates } from "@/lib/duplicateDetection";
import { calculatePriorityScore } from "@/lib/priority";
import { routing } from "@/lib/departmentRouting";
import { publicContacts } from "@/lib/responsibility";
import { caseLabel, caseNumber } from "@/lib/caseLabel";
import { analyzeIssue } from "@/services/issueClassifier";
import { useCivic } from "./CivicProvider";
import { ImageUploader } from "./ImageUploader";
import { IssueMap } from "./IssueMap";
import { Badge, PriorityScore } from "./ui";
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
export function ReportFlow() {
  const { state, submit, notify } = useCivic();
  const [step, setStep] = useState(0);
  const [description, setDescription] = useState("");
  const [imageUrl, setImage] = useState<string>();
  const [location, setLocation] = useState({ ...locations[0] });
  const [analysis, setAnalysis] = useState<Analysis>();
  const [analysing, setAnalysing] = useState(false);
  const [phase, setPhase] = useState(0);
  const [result, setResult] = useState<{
    id: string;
    reportId: string;
    merged: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognizer = useRef<Recognition | null>(null);
  const submitted = useRef(false);
  useEffect(() => {
    const browser = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    setSpeechSupported(
      !!(browser.SpeechRecognition || browser.webkitSpeechRecognition),
    );
    return () => recognizer.current?.stop();
  }, []);
  const match = analysis
    ? findNearbyDuplicates(
        { ...location, description, category: analysis.category },
        state.issues,
      )[0]
    : undefined;
  const priority = analysis
    ? calculatePriorityScore({
        category: analysis.category,
        description,
        reporterCount: match?.issue.reporterCount ?? 1,
        communityConfirmations: match?.issue.communityConfirmations ?? 0,
        createdAt: match?.issue.createdAt,
        status: match?.issue.status,
      })
    : null;
  function useScenario() {
    setDescription(
      "Large pothole outside the school. Cars are swerving and it is dangerous for students.",
    );
    setLocation({ ...locations[0] });
    setImage("/demo-pothole.png");
    notify("Demo scenario loaded: school-zone pothole in Koramangala.");
  }
  function startSpeech() {
    const browser = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor =
      browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) return;
    const recognition = new Constructor();
    recognizer.current = recognition;
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) =>
      setDescription((prev) =>
        `${prev} ${e.results[0][0].transcript}`.trim().slice(0, 3000),
      );
    recognition.onerror = () => {
      setRecording(false);
      notify("Voice input unavailable. You can type your description.");
    };
    recognition.onend = () => setRecording(false);
    try {
      recognition.start();
      setRecording(true);
    } catch {
      notify("Microphone access unavailable. Please type your description.");
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setError(
        "Location is unavailable in this browser. Choose a location below.",
      );
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: "Current location — add a nearby landmark",
          ward: "",
        });
        setLocating(false);
      },
      () => {
        setError(
          "We could not access your location. Choose a neighbourhood or move the map pin.",
        );
        setLocating(false);
      },
      { timeout: 10000 },
    );
  }
  async function analyse() {
    if (
      !location.address.trim() ||
      !Number.isFinite(location.latitude) ||
      !Number.isFinite(location.longitude) ||
      Math.abs(location.latitude) > 90 ||
      Math.abs(location.longitude) > 180
    ) {
      setError("Enter a valid location, latitude and longitude.");
      return;
    }
    setError("");
    setStep(2);
    setAnalysing(true);
    setPhase(0);
    const timer = setInterval(() => setPhase((p) => Math.min(p + 1, 3)), 650);
    const [data] = await Promise.all([
      analyzeIssue(description),
      new Promise((resolve) => setTimeout(resolve, 2300)),
    ]);
    clearInterval(timer);
    setAnalysis(data);
    setAnalysing(false);
  }
  function register() {
    if (!analysis || submitted.current) return;
    submitted.current = true;
    const registered = submit({ ...location, description, imageUrl }, analysis);
    if (registered) {
      setResult({
        id: registered.issue.id,
        reportId: registered.reportId,
        merged: registered.merged,
      });
      setStep(3);
    } else submitted.current = false;
  }
  const phases = [
    "Reading your report",
    "Classifying the issue",
    "Checking nearby cases",
    "Calculating civic priority",
  ];
  const registeredIssue = result
    ? state.issues.find((i) => i.id === result.id)
    : null;
  return (
    <div className="page report-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SMALL ACTION. SHARED IMPACT.</span>
          <h1>
            Make your neighbourhood better<span className="blue">.</span>
          </h1>
          <p>
            Tell us what needs attention. We’ll help it reach the right team.
          </p>
        </div>
        <Link href="/citizen" className="text-link">
          My reports
        </Link>
      </div>
      <div className="report-layout">
        <section className="panel report-panel">
          <div className="stepper">
            {["The issue", "Location", "Review", "Submitted"].map(
              (label, i) => (
                <div
                  key={label}
                  className={`${i === step ? "current" : ""} ${i < step ? "done" : ""}`}
                >
                  <span>{i < step ? <Check size={15} /> : i + 1}</span>
                  <strong>{label}</strong>
                </div>
              ),
            )}
          </div>
          {step === 0 && (
            <div className="form-section">
              <div className="between form-intro">
                <div>
                  <span className="eyebrow">STEP 01</span>
                  <h2>What needs fixing?</h2>
                </div>
                <span className="form-icon">
                  <FileText size={23} />
                </span>
              </div>
              <p>
                A clear description helps city teams understand the problem.
              </p>
              <div className="demo-scenario">
                <Sparkles size={18} />
                <div>
                  <strong>Take CivicPulse for a spin</strong>
                  <span>Try our school-zone pothole scenario.</span>
                </div>
                <button
                  type="button"
                  className="button secondary small"
                  onClick={useScenario}
                >
                  Use demo scenario
                </button>
              </div>
              <div className="field">
                <label htmlFor="description">
                  Describe the issue <span className="required">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={3000}
                  placeholder="For example: A large pothole has formed near the school entrance and vehicles are swerving around it."
                />
                <div className="between textarea-meta">
                  <button
                    className={`voice-button ${recording ? "recording" : ""}`}
                    type="button"
                    disabled={!speechSupported}
                    title={
                      !speechSupported
                        ? "Speech recognition is not supported in this browser. Please type instead."
                        : "Use your microphone"
                    }
                    onClick={() =>
                      recording ? recognizer.current?.stop() : startSpeech()
                    }
                  >
                    <Mic size={14} />
                    {recording
                      ? "Listening… click to stop"
                      : speechSupported
                        ? "Use voice input"
                        : "Voice input unavailable in this browser"}
                  </button>
                  <small>{description.length}/3000</small>
                </div>
              </div>
              <div className="field">
                <label>
                  Photo evidence <span className="optional">Optional</span>
                </label>
                <ImageUploader value={imageUrl} onChange={setImage} sample />
                <p className="field-hint">
                  Photos help the field team verify the issue. Local analysis
                  uses your description.
                </p>
              </div>
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <span>
                  <ShieldCheck size={14} />
                  Your report makes a difference
                </span>
                <button
                  className="button primary"
                  onClick={() => {
                    if (description.trim().length < 12) {
                      setError(
                        "Please describe the issue in at least 12 characters.",
                      );
                      return;
                    }
                    setError("");
                    setStep(1);
                  }}
                >
                  Continue to location
                </button>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="form-section">
              <span className="eyebrow">STEP 02</span>
              <h2>Where is the problem?</h2>
              <p>
                Choose a neighbourhood, tap the map, or drag the pin to the
                exact spot.
              </p>
              <div className="location-toolbar">
                <Select
                  aria-label="Choose a Bengaluru neighbourhood"
                  onChange={(e) => {
                    const place = locations.find(
                      (l) => l.address === e.target.value,
                    );
                    if (place) setLocation({ ...place });
                  }}
                  value={
                    locations.some((l) => l.address === location.address)
                      ? location.address
                      : ""
                  }
                >
                  <option value="" disabled>
                    Select neighbourhood
                  </option>
                  {locations.map((l) => (
                    <option key={l.address}>{l.address}</option>
                  ))}
                </Select>
                <button
                  className="button secondary"
                  onClick={locate}
                  disabled={locating}
                >
                  <LocateFixed size={16} />
                  {locating ? "Locating…" : "Use my location"}
                </button>
              </div>
              <IssueMap
                issues={[]}
                pick={location}
                onPick={(latitude, longitude) =>
                  setLocation((l) => ({ ...l, latitude, longitude }))
                }
                compact
              />
              <div className="field">
                <label htmlFor="address">Address or nearby landmark</label>
                <input
                  id="address"
                  value={location.address}
                  onChange={(e) =>
                    setLocation({ ...location, address: e.target.value })
                  }
                />
              </div>
              <div className="coordinate-fields">
                <div className="field">
                  <label htmlFor="latitude">Latitude</label>
                  <input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    min="-90"
                    max="90"
                    value={location.latitude}
                    onChange={(e) =>
                      setLocation({
                        ...location,
                        latitude: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="longitude">Longitude</label>
                  <input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    min="-180"
                    max="180"
                    value={location.longitude}
                    onChange={(e) =>
                      setLocation({
                        ...location,
                        longitude: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="ward">Ward</label>
                  <input
                    id="ward"
                    value={location.ward}
                    placeholder="Optional"
                    onChange={(e) =>
                      setLocation({ ...location, ward: e.target.value })
                    }
                  />
                </div>
              </div>
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button className="button secondary" onClick={() => setStep(0)}>
                  <ChevronLeft size={15} />
                  Back
                </button>
                <button
                  className="button primary"
                  onClick={() => void analyse()}
                >
                  <Sparkles size={16} />
                  Analyse report
                </button>
              </div>
            </div>
          )}
          {step === 2 &&
            (analysing ? (
              <div className="analysis-loading" aria-live="polite">
                <div className="analysis-orbit">
                  <Activity size={35} />
                </div>
                <span className="eyebrow">TURNING A REPORT INTO ACTION</span>
                <h2>Finding the right response.</h2>
                <p>A few checks now. A clearer path forward.</p>
                <div className="analysis-phases">
                  {phases.map((text, i) => (
                    <div key={text} className={i <= phase ? "complete" : ""}>
                      {i < phase ? (
                        <Check size={17} />
                      ) : i === phase ? (
                        <span className="spinner" />
                      ) : (
                        <span className="phase-dot" />
                      )}
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              analysis &&
              priority && (
                <div className="form-section">
                  <div className="analysis-done">
                    <span>
                      <CheckCheck size={22} />
                    </span>
                    <div>
                      <span className="eyebrow">ANALYSIS COMPLETE</span>
                      <h2>Your report has a path forward.</h2>
                    </div>
                  </div>
                  <div className="analysis-results">
                    <div>
                      <span>Detected issue</span>
                      <strong>{analysis.category}</strong>
                      <small>
                        {Math.round(analysis.confidence * 100)}%{" "}
                        {analysis.source === "local"
                          ? "keyword match score"
                          : analysis.source === "ollama"
                            ? "local AI estimate"
                            : "provider estimate"}
                      </small>
                    </div>
                    <div>
                      <span>Severity</span>
                      <Badge value={priority.severity} />
                      <small>Civic Priority Score {priority.score}/100</small>
                    </div>
                    <div className="wide">
                      <span>Recommended department</span>
                      <strong>{routing[analysis.category]}</strong>
                      <small>
                        Likely authority:{" "}
                        {publicContacts[analysis.category].authority} ·{" "}
                        {publicContacts[analysis.category].phone
                          ? `Call ${publicContacts[analysis.category].phone}`
                          : "See official website"}
                      </small>
                    </div>
                  </div>
                  {match && (
                    <div className="duplicate-alert">
                      <Fingerprint size={26} />
                      <div>
                        <span className="eyebrow">EXISTING ISSUE DETECTED</span>
                        <h3>
                          {match.issue.reporterCount} citizens have already
                          reported this.
                        </h3>
                        <p>
                          Your report will strengthen{" "}
                          <strong>{caseLabel(match.issue)}</strong>, instead of
                          creating a separate case.
                        </p>
                        <span className="small-text">
                          <MapPin size={13} />
                          {Math.round(match.distance)} m from your selected
                          location · {match.issue.address}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="analysis-summary">
                    <Sparkles size={17} />
                    <div>
                      <strong>Analysis summary</strong>
                      <p>{analysis.summary}</p>
                    </div>
                  </div>
                  <p className="analysis-disclaimer">
                    <CircleHelp size={15} />
                    {analysis.source === "local"
                      ? "Local demo analysis · keyword-based, no image recognition."
                      : analysis.source === "ollama"
                        ? "Analysed by your local Ollama model."
                        : "External analysis provider."}{" "}
                    Recommendations can be reviewed by civic authorities.
                  </p>
                  <div className="form-actions">
                    <button
                      className="button secondary"
                      onClick={() => setStep(1)}
                    >
                      <ChevronLeft size={15} />
                      Review location
                    </button>
                    <button className="button primary" onClick={register}>
                      {match
                        ? "Add my report to this case"
                        : "Register complaint"}
                    </button>
                  </div>
                </div>
              )
            ))}
          {step === 3 && result && registeredIssue && (
            <div className="success-screen">
              <span className="success-check">
                <Check size={32} />
              </span>
              <span className="eyebrow">
                YOUR VOICE IS PART OF THE SOLUTION
              </span>
              <h2>
                {result.merged
                  ? "One shared case. A stronger voice."
                  : "Report received. Action starts here."}
              </h2>
              <p>
                {result.merged
                  ? "We’ve linked your report to the existing issue. Every citizen report helps city teams understand the impact."
                  : "Your issue has been classified and routed to the right department for review."}
              </p>
              <div className="tracking-ticket">
                <span>YOUR CASE</span>
                <strong>{caseLabel(registeredIssue)}</strong>
                <small>
                  Tracking reference: {result.id} ({caseNumber(result.id)})
                </small>
                <small>Report receipt: {result.reportId}</small>
                <div className="between">
                  <Badge value={registeredIssue.severity} />
                  <Badge value={registeredIssue.status} />
                </div>
                <p>{registeredIssue.department}</p>
                <span className="citizen-count">
                  <Users size={18} />
                  {registeredIssue.reporterCount} citizen reports · one
                  actionable case
                </span>
              </div>
              <div className="button-row">
                <Link className="button primary" href={`/track/${result.id}`}>
                  Track this complaint
                </Link>
                <Link
                  className="button secondary"
                  href={`/map?issue=${result.id}`}
                >
                  View on map
                </Link>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setStep(0);
                  setDescription("");
                  setImage(undefined);
                  setAnalysis(undefined);
                  setResult(null);
                  submitted.current = false;
                }}
              >
                Report another issue
              </button>
            </div>
          )}
        </section>
        <aside className="report-aside">
          <div className="aside-card">
            <span className="aside-icon">
              <Activity size={25} />
            </span>
            <h3>What happens next?</h3>
            <p>We help you turn a local problem into a clear report.</p>
            <div className="aside-point">
              <Fingerprint size={19} />
              <div>
                <strong>Check for a match</strong>
                <p>
                  If someone already reported it, add your voice to the same
                  case.
                </p>
              </div>
            </div>
            <div className="aside-point">
              <Activity size={19} />
              <div>
                <strong>Find the right team</strong>
                <p>
                  See which department handles the issue and how to contact
                  them.
                </p>
              </div>
            </div>
            <div className="aside-point">
              <CheckCheck size={19} />
              <div>
                <strong>Keep your case number</strong>
                <p>
                  Use it to check updates and see when the problem is fixed.
                </p>
              </div>
            </div>
          </div>
          <div className="aside-note">
            <ShieldCheck size={18} />
            <p>
              Hackathon demo. Reports are stored in this browser and are not
              sent to Bengaluru authorities.
            </p>
          </div>
          {priority && (
            <div className="aside-card priority-breakdown">
              <div className="between">
                <h3>Civic Priority Score</h3>
                <PriorityScore
                  score={priority.score}
                  severity={priority.severity}
                />
              </div>
              {priority.factors.map((f) => (
                <div className="between" key={f.label}>
                  <span>{f.label}</span>
                  <strong>+{f.value}</strong>
                </div>
              ))}
              <small>
                A transparent demo metric, not an official government score.
              </small>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
