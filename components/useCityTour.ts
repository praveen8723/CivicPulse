"use client";
import { useEffect, useMemo, useState } from "react";
import { Issue } from "@/types/civic";

export function useCityTour(issues: Issue[]) {
  const stops = useMemo(() => {
    const seen = new Set<string>();
    return [...issues]
      .filter((i) => i.status !== "Resolved")
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .filter((i) => {
        if (seen.has(i.address)) return false;
        seen.add(i.address);
        return true;
      })
      .slice(0, 6);
  }, [issues]);
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!running || !stops.length) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;
    const timer = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % stops.length);
    }, 7000);
    const pause = () => {
      if (document.hidden || preference.matches) setRunning(false);
    };
    preference.addEventListener("change", pause);
    document.addEventListener("visibilitychange", pause);
    return () => {
      clearInterval(timer);
      preference.removeEventListener("change", pause);
      document.removeEventListener("visibilitychange", pause);
    };
  }, [running, stops]);
  return {
    stops,
    index: Math.min(index, Math.max(0, stops.length - 1)),
    running,
    stop: stops[Math.min(index, Math.max(0, stops.length - 1))],
    pause: () => setRunning(false),
    start: () => {
      setIndex(0);
      setRunning(true);
    },
    next: () => setIndex((i) => (i + 1) % Math.max(1, stops.length)),
  };
}
