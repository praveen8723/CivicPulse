"use client";
import { Select } from "@/components/Select";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Box,
  MapPinned,
  HelpCircle,
  LayoutGrid,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useCivic } from "./CivicProvider";
import { useDialogAccessibility } from "./useDialogAccessibility";
import { useLanguage } from "./LanguageProvider";
import { DemoVideo } from "./DemoVideo";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    authority = path.startsWith("/authority");
  const { reset, state } = useCivic();
  const { language, setLanguage } = useLanguage();
  const [mobile, setMobile] = useState(false);
  const [dialog, setDialog] = useState<"help" | "reset" | null>(null);
  useDialogAccessibility(!!dialog, () => setDialog(null));
  const links = [
    {
      href: authority ? "/authority" : "/citizen",
      label: "Overview",
      icon: LayoutGrid,
    },
    { href: "/map", label: "City map", icon: MapPinned },
    {
      href: authority ? "/authority/issues" : "/report",
      label: authority ? "Cases" : "Report issue",
      icon: authority ? Box : Plus,
    },
    { href: "/track", label: "Track a report", icon: Search },
  ];
  return (
    <div className={`command-shell ${path === "/" ? "is-home" : ""}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="command-header">
        <Link href="/" className="command-brand">
          <span className="brand-orbit">
            <Activity size={23} />
          </span>
          <span>
            CIVIC<span>PULSE</span>
            <small>A BETTER CITY, TOGETHER</small>
          </span>
        </Link>
        <nav
          className={`command-tabs ${mobile ? "open" : ""}`}
          id="main-navigation"
          aria-label="Main navigation"
        >
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path === href ||
                (href === "/authority/issues" && path.startsWith(href + "/"))
                  ? "page"
                  : undefined
              }
              onClick={() => setMobile(false)}
              className={
                path === href ||
                (href === "/authority/issues" && path.startsWith(href + "/"))
                  ? "active"
                  : ""
              }
            >
              <Icon size={15} />
              {label}
              {path === href && <i />}
            </Link>
          ))}
          <Link
            className="mobile-role-link"
            href={authority ? "/citizen" : "/authority"}
            onClick={() => setMobile(false)}
          >
            <Shield size={15} />
            {authority ? "Citizen view" : "Authority view"}
          </Link>
        </nav>
        <div className="command-header-right">
          <label className="language-select" data-no-translate>
            <span>{language === "kn" ? "ಭಾಷೆ" : "Language"}</span>
            <Select
              data-testid="language-select"
              aria-label={language === "kn" ? "ಭಾಷೆ" : "Language"}
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as "en" | "kn")
              }
            >
              <option value="en">English</option>
              <option value="kn">ಕನ್ನಡ</option>
            </Select>
          </label>
          <div className="command-role">
            <Link
              href="/citizen"
              className={!authority ? "active" : ""}
              aria-label="Citizen view"
            >
              <Users size={14} />
              <span>Citizen</span>
            </Link>
            <Link
              href="/authority"
              className={authority ? "active" : ""}
              aria-label="Authority view"
            >
              <Shield size={14} />
              <span>Authority</span>
            </Link>
          </div>
          <button
            className="command-menu"
            aria-expanded={mobile}
            aria-controls="main-navigation"
            aria-label={mobile ? "Close navigation" : "Open navigation"}
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <div className="command-content">
        <main id="main" key={path}>
          {children}
        </main>
        <footer className="command-footer">
          <span>
            <span className="footer-brand">CivicPulse</span> Bengaluru ·{" "}
            {state.issues.length} demo cases
          </span>
          <div className="footer-tools">
            <span>Demo data · Saved in this browser</span>
            <button onClick={() => setDialog("help")}>
              <HelpCircle size={14} /> Demo guide
            </button>
            <button onClick={() => setDialog("reset")}>
              <RotateCcw size={13} /> Reset demo
            </button>
          </div>
        </footer>
      </div>
      {dialog && (
        <div className="modal-backdrop">
          <section
            className={`modal command-modal ${dialog === "help" ? "demo-guide-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={() => setDialog(null)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">CIVICPULSE / WORKSPACE</span>
            <h2 id="dialog-title">
              {dialog === "help"
                ? "One report. A visible difference."
                : "Reset the demo workspace?"}
            </h2>
            {dialog === "help" ? (
              <>
                <DemoVideo compact />
                <ol className="guide-list">
                  <li>Explore the map to see issues in your neighbourhood.</li>
                  <li>Open Report issue and select “Use demo scenario”.</li>
                  <li>
                    Review the suggested category and any matching reports.
                  </li>
                  <li>Add your report to the school-zone pothole case.</li>
                  <li>
                    Open authority view, update the case, then return to the
                    tracker.
                  </li>
                </ol>
                <p>
                  Data stays in this browser. Authority access is simulated.
                  Reports here are for demonstration and are not sent to city
                  departments.
                </p>
                <Link
                  className="button primary"
                  href="/report"
                  onClick={() => setDialog(null)}
                >
                  Start the demo <ArrowUpRight size={16} />
                </Link>
              </>
            ) : (
              <>
                <p>
                  This clears locally saved reports, notes, photos and case
                  updates, and restores the 48 original demo cases.
                </p>
                <div className="button-row">
                  <button
                    className="button secondary"
                    onClick={() => setDialog(null)}
                  >
                    Keep my changes
                  </button>
                  <button
                    className="button danger"
                    onClick={() => {
                      reset();
                      setDialog(null);
                    }}
                  >
                    Reset demo
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
