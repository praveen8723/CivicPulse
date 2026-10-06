"use client";
import dynamic from "next/dynamic";
import { Issue } from "@/types/civic";
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <span className="spinner" />
      Loading city map…
    </div>
  ),
});
export interface MapProps {
  issues: Issue[];
  heatmap?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  pick?: { latitude: number; longitude: number };
  onPick?: (latitude: number, longitude: number) => void;
  compact?: boolean;
  view?: "city" | "overview";
  rotating?: boolean;
  interactive?: boolean;
  onUserInteract?: () => void;
}
const VectorMap = dynamic(() => import("./VectorMap"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <span className="spinner" />
      Initialising city view…
    </div>
  ),
});
export function IssueMap(props: MapProps) {
  return (
    <div className={`map-container ${props.compact ? "compact" : ""}`}>
      {props.onPick ? <LeafletMap {...props} /> : <VectorMap {...props} />}
    </div>
  );
}
