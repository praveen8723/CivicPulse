"use client";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MapProps } from "./IssueMap";
import { Badge } from "./ui";
import { severityColors as colors } from "@/lib/severityColors";
function MapController({ selected, issues, pick, onPick }: MapProps) {
  const map = useMap();
  const latitude = pick?.latitude;
  const longitude = pick?.longitude;
  useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  useEffect(() => {
    const issue = issues.find((i) => i.id === selected);
    if (issue)
      map.flyTo([issue.latitude, issue.longitude], 14, { duration: 0.7 });
  }, [selected, issues, map]);
  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined)
      map.setView([latitude, longitude], 15);
  }, [latitude, longitude, map]);
  return null;
}
export default function LeafletMap(props: MapProps) {
  const { issues, heatmap, pick, onPick } = props;
  const [tileError, setTileError] = useState(false);
  return (
    <>
      <MapContainer
        center={pick ? [pick.latitude, pick.longitude] : [12.949, 77.621]}
        zoom={pick ? 15 : 12}
        scrollWheelZoom={false}
        className="leaflet-map"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: () => setTileError(true),
            load: () => setTileError(false),
          }}
        />
        <MapController {...props} />
        {issues.map((issue) =>
          heatmap ? (
            <Circle
              key={issue.id}
              center={[issue.latitude, issue.longitude]}
              radius={250 + issue.reporterCount * 24}
              pathOptions={{
                color: colors[issue.severity],
                weight: 1,
                fillColor: colors[issue.severity],
                fillOpacity: 0.2,
              }}
            >
              <Popup>
                <strong>{issue.title}</strong>
                <p>
                  {issue.reporterCount} reports · {issue.severity}
                </p>
                <Link href={`/track/${issue.id}`}>View details</Link>
              </Popup>
            </Circle>
          ) : (
            <Marker
              key={issue.id}
              position={[issue.latitude, issue.longitude]}
              eventHandlers={{ click: () => props.onSelect?.(issue.id) }}
              icon={L.divIcon({
                className: "civic-marker-wrapper",
                html: `<span class="civic-marker ${props.selected === issue.id ? "selected" : ""}" style="--marker-color:${issue.status === "Resolved" ? colors.Low : colors[issue.severity]}">${issue.status === "Resolved" ? "✓" : issue.category === "Pothole" || issue.category === "Road Damage" ? "!" : issue.category === "Water Leakage" ? "~" : issue.category === "Broken Streetlight" ? "ϟ" : "•"}</span>`,
                iconSize: [30, 36],
                iconAnchor: [15, 34],
              })}
            >
              <Popup>
                <div className="map-popup">
                  <span className="eyebrow">{issue.category}</span>
                  <h3>{issue.title}</h3>
                  <Badge value={issue.severity} />
                  <Badge value={issue.status} />
                  <p>
                    {issue.locationApproximate
                      ? "Approximate area · unverified online lead"
                      : `${issue.reporterCount} citizen reports`}
                  </p>
                  <Link href={`/track/${issue.id}`}>View case details</Link>
                </div>
              </Popup>
            </Marker>
          ),
        )}
        {pick && onPick && (
          <Marker
            position={[pick.latitude, pick.longitude]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const point = e.target.getLatLng();
                onPick?.(point.lat, point.lng);
              },
            }}
            icon={L.divIcon({
              className: "civic-marker-wrapper",
              html: '<span class="civic-marker" style="--marker-color:#2860db">+</span>',
              iconSize: [30, 36],
              iconAnchor: [15, 34],
            })}
          />
        )}
      </MapContainer>
      {tileError && (
        <div className="map-warning">
          Map tiles unavailable. Case markers and location coordinates remain
          usable.
        </div>
      )}
    </>
  );
}
