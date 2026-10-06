"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Crosshair,
  MapPin,
  MapPinned,
  Pause,
  Play,
  Plus,
  Radio,
  ScanLine,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useCivic } from "@/components/CivicProvider";
import { IssueMap } from "@/components/IssueMap";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { caseNumber } from "@/lib/caseLabel";
import styles from "./page.module.css";
import { DemoVideo } from "@/components/DemoVideo";

/** Decorative city illustration, independent of map tiles. */
function SignalCity() {
  const citySize = 7;
  const cellSize = 30;
  const footprint = 24;
  const inset = (cellSize - footprint) / (2 * cellSize);
  // Buildings and ground share an isometric projection. Grid bounds -1..8
  // leave exactly one unoccupied cell around the seven occupied rows/columns.
  const project = (col: number, row: number) => ({
    x: 280 + (col - row) * cellSize,
    y: 205 + ((col + row) * cellSize) / 2,
  });
  const gridPoint = (col: number, row: number) => {
    const { x, y } = project(col, row);
    return `${x},${y}`;
  };
  const blocks = Array.from({ length: citySize ** 2 }, (_, i) => {
    const row = Math.floor(i / citySize),
      col = i % citySize;
    const back = project(col + inset, row + inset);
    return {
      id: i,
      depth: row + col,
      x: back.x - footprint,
      y: back.y + footprint / 2,
      h: 18 + ((i * 37 + row * 11) % 88),
    };
  }).sort((a, b) => a.depth - b.depth);
  const signals = [16, 28].map((id) =>
    blocks.find((block) => block.id === id)!,
  );
  return (
    <div className={styles.cityArt} aria-hidden="true">
      <div className={styles.orbit} />
      <div className={styles.orbitInner} />
      <svg className={styles.citySvg} viewBox="0 0 560 540" fill="none">
        <defs>
          <radialGradient id="city-glow">
            <stop stopColor="white" stopOpacity=".12" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="building-face" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#282828" />
            <stop offset="1" stopColor="#0b0b0b" />
          </linearGradient>
        </defs>
        <ellipse cx="280" cy="337" rx="280" ry="185" fill="url(#city-glow)" />
        <g stroke="#fff" strokeOpacity=".12" data-city-grid>
          {Array.from({ length: citySize + 3 }, (_, i) => (
            <g key={i}>
              <path
                d={`M${gridPoint(i - 1, -1)} L${gridPoint(i - 1, citySize + 1)}`}
              />
              <path
                d={`M${gridPoint(-1, i - 1)} L${gridPoint(citySize + 1, i - 1)}`}
              />
            </g>
          ))}
        </g>
        {blocks.map(({ id, x, y, h }, i) => (
          <g
            key={id}
            className={styles.building}
            style={{ animationDelay: `${i * 16}ms` }}
          >
            <path
              d={`M${x},${y} l0,-${h} 24,12 0,${h}Z`}
              fill="url(#building-face)"
              stroke="#505050"
              strokeWidth=".6"
            />
            <path
              d={`M${x + 24},${y + 12} l0,-${h} 24,-12 0,${h}Z`}
              fill="#111"
              stroke="#444"
              strokeWidth=".6"
            />
            <path
              d={`M${x},${y - h} l24,-12 24,12 -24,12Z`}
              fill="#303030"
              stroke="#888"
              strokeWidth=".6"
            />
            <path
              d={`M${x + 5},${y - h + 12} l14,7 m-14,3 l14,7 M${x + 31},${y - h + 19} l13,-6.5`}
              stroke="#aaa"
              strokeOpacity={i % 3 === 0 ? ".65" : ".15"}
              strokeWidth="2"
            />
          </g>
        ))}
        {signals.map(({ id, x, y, h }, index) => (
          <g
            key={id}
            className={styles.signalBeam}
            style={{ animationDelay: `${index * 1.5}s` }}
          >
            <path
              d={`M${x + footprint} ${y - h} v-80`}
              stroke="white"
              strokeDasharray="3 5"
              strokeOpacity=".5"
            />
            <circle cx={x + footprint} cy={y - h - 80} r="4" fill="white" />
            <circle
              cx={x + footprint}
              cy={y - h - 80}
              r="13"
              stroke="white"
              strokeOpacity=".3"
            />
            <ellipse
              cx={x + footprint}
              cy={y - h}
              rx="20"
              ry="10"
              stroke="white"
              strokeOpacity=".4"
            />
          </g>
        ))}
      </svg>
      <div className={styles.artCoordinate}>12.9716° N / 77.5946° E</div>
      <div className={styles.signalTag}>
        <Radio size={15} />
        <span>
          One signal.<small>A city of possibilities.</small>
        </span>
        <span className={styles.liveDot} />
      </div>
      <span className={styles.artCaption}>
        CONNECTED BY PEOPLE. POWERED BY ACTION.
      </span>
    </div>
  );
}

export default function Home() {
  const { state } = useCivic();
  const [moving, setMoving] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const resolved = state.issues.filter(
    (issue) => issue.status === "Resolved",
  ).length;
  const active = state.issues.length - resolved;
  const featured = [...state.issues]
    .filter((issue) => issue.status !== "Resolved")
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements =
      root.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!elements || preference.matches || !("IntersectionObserver" in window))
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove(styles.pending);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    elements.forEach((element) => {
      element.classList.add(styles.pending);
      observer.observe(element);
    });
    const revealAll = () => {
      if (preference.matches) {
        elements.forEach((element) => element.classList.remove(styles.pending));
        observer.disconnect();
      }
    };
    preference.addEventListener("change", revealAll);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", revealAll);
    };
  }, []);

  return (
    <div
      ref={root}
      className={`${styles.home} ${!moving ? styles.paused : ""}`}
    >
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.context}>
          <span>
            <MapPin size={13} /> BENGALURU, INDIA
          </span>
          <span>
            <i className={styles.liveDot} /> INTERACTIVE DEMO
          </span>
        </div>
        <div className={styles.heroGrid}>
          <div className={`glass-hero-copy ${styles.heroCopy}`}>
            <span className={styles.eyebrow}>
              <span className={styles.shortLine} /> YOUR CITY. YOUR SIGNAL.
            </span>
            <h1 id="hero-title">
              Small actions.
              <br />
              <span>Real change.</span>
            </h1>
            <p>
              A better city starts with people who care.
              <br />
              Spot a problem. Send a signal. Be part of the fix.
            </p>
            <div className={styles.actions}>
              <Link href="/report" className="button primary">
                <Plus size={17} /> Report an issue <ArrowUpRight size={17} />
              </Link>
              <Link href="/track" className={styles.textLink}>
                Track a report <ArrowRight size={16} />
              </Link>
            </div>
            <div className={styles.reassurance}>
              <ShieldCheck size={14} /> A clear path from your report to a
              resolution.
            </div>
          </div>
          <SignalCity />
        </div>
        <div className={styles.heroBottom}>
          <a href="#city-pulse">
            <ArrowDown size={14} /> SCROLL TO EXPLORE
          </a>
          <button
            onClick={() => setMoving(!moving)}
            aria-pressed={!moving}
            aria-label={moving ? "Pause animations" : "Resume animations"}
          >
            {moving ? <Pause size={12} /> : <Play size={12} />}
            {moving ? "Pause motion" : "Resume motion"}
          </button>
          <span>01 — A CITY THAT LISTENS</span>
        </div>
      </section>

      <section
        id="city-pulse"
        className={styles.impact}
        aria-label="City impact"
        data-reveal
      >
        <div className={styles.impactIntro}>
          <Activity size={23} />
          <span>
            Small signals.
            <br />
            <strong>Collective impact.</strong>
          </span>
          <small>OUR DEMO CITY, IN NUMBERS</small>
        </div>
        {[
          {
            value: state.issues.length,
            label: "Issues reported",
            icon: MapPin,
          },
          {
            value: state.issues.reduce(
              (sum, issue) => sum + issue.reporterCount,
              0,
            ),
            label: "Citizen voices",
            icon: Users,
          },
          { value: resolved, label: "Problems resolved", icon: CheckCheck },
        ].map(({ value, label, icon: Icon }) => (
          <div className={styles.stat} key={label}>
            <div>
              <AnimatedNumber
                value={value}
                animateOnView
                duration={1800}
                paused={!moving}
              />
            </div>
            <span>
              <Icon size={14} />
              {label}
            </span>
          </div>
        ))}
      </section>

      <section
        className={styles.section}
        aria-labelledby="action-title"
        data-reveal
      >
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>01 / MAKE A DIFFERENCE</span>
            <h2 id="action-title">
              Good cities don’t just happen.
              <br />
              <span>We build them together.</span>
            </h2>
          </div>
          <p>
            From the street you walk to the neighbourhood
            <br />
            you call home. Start right where you are.
          </p>
        </div>
        <div className={styles.actionGrid}>
          {[
            {
              href: "/report",
              icon: ScanLine,
              title: "See it. Signal it.",
              description:
                "That pothole. That broken streetlight. Turn an everyday problem into a step forward.",
              action: "Report a problem",
              kind: "report",
            },
            {
              href: "/map",
              icon: MapPinned,
              title: "A city, in full view.",
              description:
                "Explore your neighbourhood. See what needs attention and where change is happening.",
              action: "Explore your neighbourhood",
              kind: "map",
            },
            {
              href: "/track",
              icon: Crosshair,
              title: "Follow the difference.",
              description:
                "Every report has a journey. Stay connected from the first signal to the final fix.",
              action: "Track a report",
              kind: "track",
            },
          ].map(({ href, icon: Icon, title, description, action, kind }, i) => (
            <Link href={href} key={href} className={styles.actionCard}>
              <div className={styles.cardTop}>
                <span>0{i + 1}</span>
                <ArrowUpRight size={21} />
              </div>
              <div
                className={`${styles.cardArt} ${styles[kind]}`}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <Icon size={40} strokeWidth={1} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className={styles.cardLink}>
                {action}
                <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.citySection}`}
        aria-labelledby="city-title"
        data-reveal
      >
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>02 / ON THE GROUND</span>
            <h2 id="city-title">The pulse of Bengaluru.</h2>
          </div>
          <Link className={styles.textLink} href="/map">
            Open city map <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className={styles.cityPanel}>
          <div className={styles.mapPreview}>
            <IssueMap
              issues={state.issues}
              view="city"
              interactive={false}
              rotating={moving}
            />
            <div className={styles.mapLabel}>
              <span className={styles.liveDot} /> BENGALURU{" "}
              <span>{active} active cases</span>
            </div>
            <Link
              className={styles.mapExplore}
              href="/map"
              aria-label="Explore the full Bengaluru city map"
            >
              <ArrowUpRight size={20} />
            </Link>
          </div>
          <div className={styles.signalList}>
            <div className={styles.signalHeading}>
              <Radio size={15} />
              <span>NEEDS OUR ATTENTION</span>
              <small>DEMO DATA</small>
            </div>
            {featured.map((issue) => (
              <Link
                key={issue.id}
                href={`/track/${issue.id}`}
                className={styles.signalRow}
              >
                <span className={styles.caseMeta}>
                  {caseNumber(issue.id)}
                  <span>{issue.status}</span>
                </span>
                <h3>{issue.title}</h3>
                <span className={styles.caseAddress}>
                  <MapPin size={12} />
                  {issue.address.split(",")[0]}
                  <ArrowUpRight size={15} />
                </span>
              </Link>
            ))}
            <Link href="/citizen" className={styles.allReports}>
              View city overview <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.journey}`}
        aria-labelledby="journey-title"
        data-reveal
      >
        <div className={styles.journeyIntro}>
          <span className={styles.eyebrow}>03 / FROM SIGNAL TO SOLUTION</span>
          <h2 id="journey-title">
            A small effort.
            <br />
            <span>A visible difference.</span>
          </h2>
          <p>
            No guessing who to contact.
            <br />
            Just a simple way to move things forward.
          </p>
          <Link href="/report" className={styles.textLink}>
            Send your first signal <ArrowUpRight size={17} />
          </Link>
        </div>
        <ol className={styles.steps}>
          {[
            {
              icon: Plus,
              title: "Spot it. Share it.",
              text: "Add a photo, describe the problem, and mark the location. Your report puts it on the map.",
            },
            {
              icon: Users,
              title: "Connect with the right team.",
              text: "Your report is matched to the relevant department. Nearby reports help show the bigger picture.",
            },
            {
              icon: Check,
              title: "See the story through.",
              text: "Track the status, see updates, and follow your report all the way to resolution.",
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <span className={styles.stepIcon}>
                <Icon size={20} />
              </span>
              <div>
                <span className={styles.stepNumber}>STEP 0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="walkthrough"
        className={styles.videoSection}
        aria-labelledby="walkthrough-title"
        data-reveal
      >
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>04 / SEE IT IN ACTION</span>
            <h2 id="walkthrough-title">
              From a signal to a solution.
              <br />
              <span>In just one minute.</span>
            </h2>
          </div>
          <p>
            Your first report, the right team,
            <br />
            and every step along the way.
          </p>
        </div>
        <DemoVideo />
      </section>
      <section className={styles.closing} data-reveal>
        <div className={styles.closingOrbit} aria-hidden="true" />
        <span className={styles.eyebrow}>
          THE NEXT CHAPTER STARTS ON YOUR STREET.
        </span>
        <h2>
          Your city.
          <br />
          Your move<span>.</span>
        </h2>
        <Link href="/report" className="button primary">
          Make a difference <ArrowUpRight size={18} />
        </Link>
        <Link href="/authority" className={styles.closingAuthority}>
          Working for the city?{" "}
          <span>
            Explore the authority workspace <ArrowUpRight size={13} />
          </span>
        </Link>
      </section>
    </div>
  );
}
