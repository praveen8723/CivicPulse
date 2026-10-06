"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Map as LibreMap,
  Marker,
  Popup,
  NavigationControl,
  GeoJSONSource,
  setWorkerUrl,
} from "maplibre-gl";
import { Crosshair, Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MapProps } from "./IssueMap";
import { Issue } from "@/types/civic";
import { caseNumber } from "@/lib/caseLabel";
import { CATEGORY_SPLIT_ZOOM, groupIssuesForMap } from "@/lib/mapGrouping";
import { severityColors as color } from "@/lib/severityColors";
const FallbackMap = dynamic(() => import("./LeafletMap"), { ssr: false });
function issueFeatures(issues: Issue[]) {
  return {
    type: "FeatureCollection" as const,
    features: issues.map((i) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [i.longitude, i.latitude],
      },
      properties: {
        id: i.id,
        weight: i.reporterCount,
        color: i.status === "Resolved" ? color.Low : color[i.severity],
      },
    })),
  };
}
function nearbyIssues(
  instance: LibreMap,
  issues: Issue[],
  point: { x: number; y: number },
) {
  const radius = Math.max(
    24,
    Math.min(75, 24 + (instance.getZoom() - 9) * 10.2),
  );
  return issues
    .map((issue) => {
      const projected = instance.project([issue.longitude, issue.latitude]);
      return {
        issue,
        distance: Math.hypot(projected.x - point.x, projected.y - point.y),
      };
    })
    .filter((item) => item.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .map((item) => item.issue);
}
export default function VectorMap(props: MapProps) {
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const ambientMarkers = useRef<Marker[]>([]);
  const popup = useRef<Popup | null>(null);
  const popupKey = useRef("");
  const popupPinned = useRef(false);
  const tooltipId = useId();
  const latest = useRef(props);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [cameraRevision, setCameraRevision] = useState(0);
  const closePreview = useCallback(() => {
    popup.current?.remove();
    popup.current = null;
    popupKey.current = "";
    popupPinned.current = false;
  }, []);
  const showPreview = useCallback(
    (issues: Issue[], hotspot = false, pinned = false) => {
      const instance = map.current;
      const issue = issues[0];
      if (!instance || !issue || latest.current.interactive === false) return;
      const key = `${hotspot}:${pinned}:${issues.map((i) => i.id).join(",")}`;
      if (popupKey.current === key) return;
      closePreview();
      const content = document.createElement("div");
      content.className = "map-preview";
      content.id = tooltipId;
      content.setAttribute("role", "tooltip");
      const add = (tag: string, className: string, text: string) => {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        content.append(element);
        return element;
      };
      add(
        "span",
        "map-preview-kicker",
        hotspot && issues.length > 1
          ? `${issues.length} nearby cases · ${issues.reduce((sum, i) => sum + i.reporterCount, 0)} reports`
          : `${caseNumber(issue.id)}${issue.locationApproximate ? " · approximate area" : ""}`,
      );
      const categoryTotals = new Map<string, number>();
      for (const item of issues)
        categoryTotals.set(
          item.category,
          (categoryTotals.get(item.category) ?? 0) + item.reporterCount,
        );
      add(
        "strong",
        "map-preview-title",
        hotspot && issues.length > 1
          ? categoryTotals.size > 1
            ? `${categoryTotals.size} issue types in this area`
            : issue.category
          : issue.title,
      );
      add("span", "map-preview-address", issue.address);
      if (hotspot && issues.length > 1) {
        for (const [category, count] of categoryTotals)
          add("span", "map-preview-breakdown", `${category}: ${count} reports`);
        add(
          "span",
          "map-preview-metrics",
          pinned
            ? "Choose a case below"
            : "Click to zoom in and separate issue types",
        );
        if (pinned)
          for (const item of issues) {
            const link = document.createElement("a");
            link.className = "map-preview-case-link";
            link.href = `/track/${encodeURIComponent(item.id)}`;
            link.textContent = `${caseNumber(item.id)} · ${item.title}`;
            content.append(link);
          }
      } else {
        const status = add(
          "span",
          "map-preview-status",
          `${issue.severity} priority · ${issue.status}`,
        );
        status.style.color = color[issue.severity];
        add(
          "span",
          "map-preview-metrics",
          `${issue.reporterCount} reports · Priority ${issue.priorityScore}/100`,
        );
      }
      popup.current = new Popup({
        className: "civic-map-tooltip",
        closeButton: pinned,
        closeOnClick: false,
        focusAfterOpen: false,
        maxWidth: pinned ? "310px" : "250px",
        offset: 18,
        subpixelPositioning: true,
      })
        .setLngLat([issue.longitude, issue.latitude])
        .setDOMContent(content)
        .addTo(instance);
      popup.current.on("close", () => {
        popup.current = null;
        popupKey.current = "";
        popupPinned.current = false;
      });
      popupKey.current = key;
      popupPinned.current = pinned;
    },
    [closePreview, tooltipId],
  );
  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    if (!host.current || fallback || failed) return;
    setLoaded(false);
    setWorkerUrl("/maplibre-worker.mjs");
    let instance: LibreMap;
    try {
      instance = new LibreMap({
        container: host.current,
        style: "/city-map-style.json",
        center: latest.current.pick
          ? [latest.current.pick.longitude, latest.current.pick.latitude]
          : [77.615, 12.951],
        zoom: latest.current.pick ? 14.5 : 10.9,
        pitch: latest.current.view === "overview" ? 0 : 50,
        minZoom: 10,
        maxBounds: [
          [77.2, 12.6],
          [78.05, 13.4],
        ],
        bearing: -22,
        attributionControl: { compact: true },
        interactive: latest.current.interactive !== false,
        canvasContextAttributes: { antialias: true },
        maxZoom: 18,
      });
    } catch {
      setFailed(true);
      return;
    }
    map.current = instance;
    if (latest.current.interactive !== false)
      instance.addControl(
        new NavigationControl({ visualizePitch: true }),
        "bottom-right",
      );
    instance.on("dragstart", () => latest.current.onUserInteract?.());
    instance.on("zoomstart", (event) => {
      if (event.originalEvent) latest.current.onUserInteract?.();
    });
    instance.on("rotatestart", (event) => {
      if (event.originalEvent) latest.current.onUserInteract?.();
    });
    instance.on("error", (event) => {
      if (event.error?.message.includes("WebGL")) setFailed(true);
      else setTileError(true);
    });
    instance.on("load", () => {
      // Labels must render above the building geometry and heatmap.
      const labels = instance
        .getStyle()
        .layers.find((layer) => layer.type === "symbol")?.id;
      instance.addLayer(
        {
          id: "civic-buildings",
          type: "fill-extrusion",
          source: "openmaptiles",
          "source-layer": "building",
          minzoom: 13,
          paint: {
            "fill-extrusion-color": "#42647b",
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
            "fill-extrusion-base": [
              "coalesce",
              ["get", "render_min_height"],
              0,
            ],
            "fill-extrusion-opacity": 0.55,
          },
        },
        labels,
      );
      instance.addSource("civic-issues", {
        type: "geojson",
        data: issueFeatures(latest.current.issues),
      });
      instance.addLayer(
        {
          id: "civic-heat",
          type: "heatmap",
          source: "civic-issues",
          layout: { visibility: latest.current.heatmap ? "visible" : "none" },
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "weight"],
              0,
              0,
              20,
              1,
            ],
            "heatmap-intensity": 1.15,
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              9,
              24,
              14,
              75,
            ],
            "heatmap-opacity": 0.65,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(78,122,139,0)",
              0.2,
              "#2563eb",
              0.5,
              "#22d3ee",
              0.75,
              color.Medium,
              1,
              color.Critical,
            ],
          },
        },
        labels,
      );
      setLoaded(true);
      setTileError(false);
    });
    const previewHeatmap = (event: { point: { x: number; y: number } }) => {
      if (
        !latest.current.heatmap ||
        latest.current.interactive === false ||
        instance.isMoving()
      )
        return;
      const nearby = nearbyIssues(instance, latest.current.issues, event.point);
      if (nearby.length) showPreview(nearby, true);
      else closePreview();
    };
    instance.on("mousemove", previewHeatmap);
    instance.on("click", previewHeatmap);
    instance.on("movestart", closePreview);
    instance.on("moveend", () => setCameraRevision((revision) => revision + 1));
    instance.getCanvas().addEventListener("mouseleave", closePreview);
    const resize = new ResizeObserver(() => instance.resize());
    resize.observe(host.current);
    return () => {
      resize.disconnect();
      closePreview();
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      ambientMarkers.current.forEach((m) => m.remove());
      ambientMarkers.current = [];
      instance.remove();
      map.current = null;
    };
  }, [fallback, failed, closePreview, showPreview]);
  useEffect(() => {
    const instance = map.current;
    if (!loaded || !instance || props.interactive !== false) return;
    const placed = props.issues.map((issue, index) => {
      const element = document.createElement("span");
      element.className = "ambient-marker";
      element.style.setProperty(
        "--signal",
        issue.status === "Resolved" ? color.Low : color[issue.severity],
      );
      element.style.setProperty("--pin-delay", `${index * 90}ms`);
      const pin = document.createElement("span");
      pin.className = "ambient-map-pin";
      const shape = document.createElement("span");
      shape.className = "ambient-map-pin-shape";
      pin.append(shape);
      element.append(pin);
      return new Marker({
        element,
        anchor: "bottom",
        pitchAlignment: "viewport",
        rotationAlignment: "viewport",
        subpixelPositioning: true,
      })
        .setLngLat([issue.longitude, issue.latitude])
        .addTo(instance);
    });
    ambientMarkers.current = placed;
    return () => {
      placed.forEach((marker) => marker.remove());
      ambientMarkers.current = [];
    };
  }, [loaded, props.interactive, props.issues]);
  useEffect(() => {
    const instance = map.current;
    if (!loaded || !instance) return;
    (instance.getSource("civic-issues") as GeoJSONSource)?.setData(
      issueFeatures(props.issues),
    );
    instance.setLayoutProperty(
      "civic-heat",
      "visibility",
      props.heatmap ? "visible" : "none",
    );
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    closePreview();
    if (props.interactive === false) return;
    const project = (longitude: number, latitude: number) =>
      instance.project([longitude, latitude]);
    const groups = props.heatmap
      ? props.issues.map(
          (issue) => groupIssuesForMap([issue], instance.getZoom(), project)[0],
        )
      : groupIssuesForMap(props.issues, instance.getZoom(), project);
    for (const group of groups) {
      const issue = group.issues[0];
      const clustered =
        !props.heatmap &&
        instance.getZoom() < CATEGORY_SPLIT_ZOOM &&
        group.issues.length > 1;
      const typeCount = new Set(group.issues.map((item) => item.category)).size;
      const element = document.createElement("button");
      element.type = "button";
      element.className = props.heatmap
        ? "heatmap-focus-target"
        : clustered
          ? "report-cluster-marker"
          : `signal-marker ${issue.severity === "Critical" ? "urgent" : ""} ${issue.status === "Resolved" ? "resolved" : ""} ${issue.locationApproximate ? "approximate" : ""} ${group.issues.some((item) => props.selected === item.id) ? "selected" : ""}`;
      element.style.setProperty(
        "--signal",
        issue.status === "Resolved" ? color.Low : color[issue.severity],
      );
      element.setAttribute(
        "aria-label",
        clustered
          ? `${group.reportCount} reports in ${group.issues.length} cases across ${typeCount} issue types near ${issue.address}. Click to zoom in.`
          : props.heatmap
            ? `Hotspot: ${issue.title}, ${issue.severity}, ${issue.reporterCount} reports`
            : `${group.category ?? issue.category}, ${group.reportCount} reports near ${issue.address}`,
      );
      element.setAttribute("aria-describedby", tooltipId);
      const preview = () =>
        props.heatmap
          ? showPreview(
              nearbyIssues(
                instance,
                latest.current.issues,
                instance.project([issue.longitude, issue.latitude]),
              ),
              true,
            )
          : showPreview(group.issues, group.issues.length > 1);
      element.onmouseenter = preview;
      element.onmouseleave = () => {
        if (!popupPinned.current && document.activeElement !== element)
          closePreview();
      };
      element.onfocus = preview;
      element.onblur = () => {
        if (!popupPinned.current) closePreview();
      };
      element.onkeydown = (event) => {
        if (event.key === "Escape") closePreview();
      };
      const dot = document.createElement("span");
      dot.className = "signal-core";
      dot.textContent =
        issue.status === "Resolved" && group.issues.length === 1
          ? "✓"
          : String(group.reportCount);
      if (!props.heatmap) element.append(dot);
      if (!props.heatmap && group.splitByCategory) {
        const label = document.createElement("span");
        label.className = "signal-category-label";
        label.textContent = group.category ?? issue.category;
        element.append(label);
      } else if (!props.heatmap && props.selected === issue.id) {
        const label = document.createElement("span");
        label.className = "signal-label";
        label.textContent = issue.address.split(",")[0];
        element.append(label);
      }
      element.onclick = (e) => {
        e.stopPropagation();
        if (clustered) {
          closePreview();
          instance.flyTo({
            center: [group.longitude, group.latitude],
            zoom: Math.max(15.8, instance.getZoom() + 2),
            pitch: 45,
            duration: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? 0
              : 1300,
          });
          return;
        }
        if (!props.heatmap && group.issues.length > 1) {
          showPreview(group.issues, true, true);
          return;
        }
        if (latest.current.onSelect) latest.current.onSelect(issue.id);
        else router.push(`/track/${issue.id}`);
      };
      markers.current.push(
        new Marker({
          element,
          anchor: "center",
          offset: group.offset,
          pitchAlignment: "viewport",
          rotationAlignment: "viewport",
          subpixelPositioning: true,
        })
          .setLngLat([group.longitude, group.latitude])
          .addTo(instance),
      );
    }
  }, [
    props.issues,
    props.selected,
    props.heatmap,
    props.view,
    props.interactive,
    loaded,
    router,
    closePreview,
    showPreview,
    tooltipId,
    cameraRevision,
  ]);
  useEffect(() => {
    const instance = map.current;
    if (!instance || !loaded) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    instance.flyTo({
      center: props.pick
        ? [props.pick.longitude, props.pick.latitude]
        : [77.615, 12.951],
      zoom: props.pick ? 14.5 : props.view === "overview" ? 11.2 : 11.65,
      pitch: props.view === "overview" ? 0 : 50,
      bearing: props.view === "overview" ? 0 : -22,
      duration: reduced ? 0 : 2000,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    });
  }, [props.view, loaded, props.pick]);
  useEffect(() => {
    const instance = map.current;
    if (!instance || !loaded || !props.selected) return;
    const issue = props.issues.find((i) => i.id === props.selected);
    if (issue)
      instance.flyTo({
        center: [issue.longitude, issue.latitude],
        zoom: 15.8,
        pitch: 55,
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 1800,
        padding: { top: 30, bottom: 30, left: 30, right: 100 },
      });
  }, [props.selected, loaded, props.issues]);
  useEffect(() => {
    const instance = map.current;
    if (
      !instance ||
      !loaded ||
      !props.rotating ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      previous = 0;
    const tick = (time: number) => {
      if (
        previous &&
        !document.hidden &&
        !preference.matches &&
        !instance.isMoving()
      ) {
        const delta = Math.min(time - previous, 50);
        instance.jumpTo({ bearing: instance.getBearing() + delta * 0.00055 });
      }
      previous = time;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [props.rotating, loaded]);
  if (failed || fallback)
    return (
      <div className="vector-fallback">
        <FallbackMap {...props} />
        <span className="fallback-label">2D compatibility view</span>
      </div>
    );
  return (
    <>
      <div
        ref={host}
        className="vector-map"
        aria-label="Interactive civic intelligence map"
        data-map-ready={loaded}
      />
      {!loaded && (
        <div className="vector-loading">
          <span className="spinner" />
          Establishing city view
        </div>
      )}
      {props.interactive !== false && (
        <div className="map-utility">
          <button
            aria-label="Recenter on Bengaluru"
            title="Recenter on Bengaluru"
            onClick={() => {
              latest.current.onUserInteract?.();
              map.current?.flyTo({
                center: [77.615, 12.951],
                zoom: 11.65,
                pitch: 50,
                bearing: -22,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
                duration: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? 0
                  : 1400,
              });
            }}
          >
            <Crosshair size={17} />
          </button>
          <button
            aria-label="Use 2D compatibility map"
            title="2D compatibility map"
            onClick={() => setFallback(true)}
          >
            <MapIcon size={17} />
          </button>
        </div>
      )}
      {tileError && (
        <div className="map-warning">
          Some map data is unavailable. You can use the 2D compatibility view.
        </div>
      )}
    </>
  );
}
