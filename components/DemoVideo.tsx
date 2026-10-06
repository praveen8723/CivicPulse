"use client";
import { useRef, useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import styles from "./DemoVideo.module.css";

const chapters = [
  { time: 5, title: "Explore" },
  { time: 13, title: "Report" },
  { time: 21, title: "Locate" },
  { time: 29, title: "Review" },
  { time: 37, title: "City teams" },
  { time: 45, title: "Track" },
];
export function DemoVideo({ compact = false }: { compact?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  async function play(at?: number) {
    if (!video.current) return;
    setStarted(true);
    if (at !== undefined) video.current.currentTime = at;
    try {
      await video.current.play();
    } catch {
      /* Controls remain available if playback is interrupted. */
    }
  }
  return (
    <div className={`${styles.player} ${compact ? styles.compact : ""}`}>
      <div className={styles.topline}>
        <span>
          <i /> CIVICPULSE / THE WALKTHROUGH
        </span>
        <span>01:00</span>
      </div>
      <div className={styles.screen}>
        <video
          data-civicpulse-tour
          ref={video}
          controls={started}
          playsInline
          preload="none"
          poster="/demo/civicpulse-tour-poster.jpg"
          aria-label="CivicPulse one-minute product walkthrough"
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onPlay={(event) => {
            const playing = event.currentTarget;
            document
              .querySelectorAll<HTMLVideoElement>("video[data-civicpulse-tour]")
              .forEach((other) => {
                if (other !== playing) other.pause();
              });
          }}
          onError={() => setFailed(true)}
        >
          <source src="/demo/civicpulse-tour.webm" type="video/webm" />
          <track
            kind="captions"
            src="/demo/civicpulse-tour.vtt"
            srcLang="en"
            label="English"
          />
          Your browser does not support video playback.
        </video>
        {!started && (
          <button
            className={styles.cover}
            onClick={() => play()}
            aria-label="Play the one-minute walkthrough"
          >
            <span className={styles.play}>
              <Play size={26} fill="currentColor" />
            </span>
            <strong>One minute. The whole picture.</strong>
            <span>
              Watch how CivicPulse works <ArrowUpRight size={14} />
            </span>
          </button>
        )}
        {failed && (
          <p className={styles.error}>
            Unable to play the walkthrough.{" "}
            <a href="/demo/civicpulse-tour.webm" download>
              Download the video
            </a>
            .
          </p>
        )}
      </div>
      <div className={styles.chapters} aria-label="Video chapters">
        {chapters.map((chapter, index) => (
          <button
            key={chapter.time}
            onClick={() => play(chapter.time)}
            className={
              time >= chapter.time && time < (chapters[index + 1]?.time ?? 60)
                ? styles.active
                : ""
            }
          >
            <small>0{index + 1}</small>
            {chapter.title}
          </button>
        ))}
      </div>
      <p className={styles.note}>
        A guided demo with on-screen captions. Reports stay in your browser.
      </p>
    </div>
  );
}
