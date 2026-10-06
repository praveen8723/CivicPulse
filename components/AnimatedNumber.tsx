"use client";
import { useEffect, useRef, useState } from "react";

/** Keep the real value available to assistive technology while the display settles. */
export function AnimatedNumber({
  value,
  pad = 0,
  animateOnView = false,
  duration = 1050,
  paused = false,
}: {
  value: number;
  pad?: number;
  animateOnView?: boolean;
  duration?: number;
  paused?: boolean;
}) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(0);
  const element = useRef<HTMLSpanElement>(null);
  const entered = useRef(false);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const from = previous.current;
    if (preference.matches) {
      previous.current = value;
      setDisplay(value);
      return;
    }
    let frame = 0;
    let start = 0;
    let observer: IntersectionObserver | undefined;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const next = Math.round(
        from + (value - from) * (1 - Math.pow(1 - progress, 3)),
      );
      previous.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    const begin = () => {
      entered.current = true;
      observer?.disconnect();
      if (paused) return;
      start = performance.now();
      frame = requestAnimationFrame(tick);
    };
    setDisplay(from);
    if (
      animateOnView &&
      !entered.current &&
      element.current &&
      "IntersectionObserver" in window
    ) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) begin();
        },
        { threshold: 0.6 },
      );
      observer.observe(element.current);
    } else begin();
    const finish = () => {
      if (preference.matches) {
        cancelAnimationFrame(frame);
        observer?.disconnect();
        previous.current = value;
        setDisplay(value);
      }
    };
    preference.addEventListener("change", finish);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      preference.removeEventListener("change", finish);
    };
  }, [value, animateOnView, duration, paused]);
  return (
    <span ref={element} aria-label={String(value)}>
      <span aria-hidden="true">{String(display).padStart(pad, "0")}</span>
    </span>
  );
}
