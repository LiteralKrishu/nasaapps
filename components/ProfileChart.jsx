"use client";

import { useRef } from "react";
import survey from "@/lib/data/survey.json";
import { linePath, useElementSize } from "@/lib/hooks";

const allElevations = Object.values(survey.routes).flatMap(route => route.profile.map(sample => sample[3]));
const ELEVATION_MIN = Math.floor((Math.min(...allElevations) - 0.25) / 2) * 2;
const ELEVATION_MAX = Math.ceil((Math.max(...allElevations) + 0.25) / 2) * 2;

/** Elevation-by-distance chart for the selected route with a draggable inspection cursor. */
export default function ProfileChart({ route, routeName, index, onInspect }) {
  const ref = useRef(null);
  const { width: measured } = useElementSize(ref);
  const width = Math.max(250, Math.round(measured || 800));
  const axes = { left: 64, right: width - 18, top: 15, bottom: 128 };
  const { left, right, top, bottom } = axes;
  const samples = route.profile;
  const routeColor = routeName === "detour" ? "var(--accent)" : "var(--direct)";
  const xAt = distance => left + distance / route.distance * (right - left);
  const yAt = elevation => bottom - (elevation - ELEVATION_MIN) / (ELEVATION_MAX - ELEVATION_MIN) * (bottom - top);
  const path = linePath(samples.map(sample => [xAt(sample[0]), yAt(sample[3])]));
  const point = samples[index];

  const onPointerMove = event => {
    const bounds = ref.current.getBoundingClientRect();
    const chartX = (event.clientX - bounds.left) / bounds.width * width;
    const fraction = Math.min(1, Math.max(0, (chartX - left) / (right - left)));
    onInspect(Math.round(fraction * (samples.length - 1)));
  };

  return (
    <svg id="profile-chart" ref={ref} viewBox={`0 0 ${width} 155`} role="img"
      aria-label="Elevation by distance along the selected route" onPointerMove={onPointerMove}>
      {[0, 1, 2, 3].map(i => {
        const elevation = ELEVATION_MAX - (ELEVATION_MAX - ELEVATION_MIN) * i / 3;
        const y = yAt(elevation);
        return (
          <g key={i}>
            <path d={`M${left} ${y}H${right}`} style={{ stroke: "var(--line)" }} />
            <text x={left - 8} y={y + 4} textAnchor="end" fontSize={12} style={{ fill: "var(--muted)" }}>{`${Math.round(elevation)} m`}</text>
          </g>
        );
      })}
      <path d={`${path}L${right} ${bottom}H${left}Z`} opacity={0.14} style={{ fill: routeColor }} />
      <path d={path} strokeWidth={2.4} fill="none" style={{ stroke: routeColor }} />
      {[0, 1, 2, 3, 4].map(i => (
        <text key={i} x={left + (right - left) * i / 4} y={148} textAnchor={i === 4 ? "end" : "middle"} fontSize={12}
          style={{ fill: "var(--muted)" }}>{`${Math.round(route.distance * i / 4)} m`}</text>
      ))}
      <g>
        <line x1={xAt(point[0])} x2={xAt(point[0])} y1={top} y2={bottom} strokeDasharray="3 4" style={{ stroke: "var(--direct)" }} />
        <circle cx={xAt(point[0])} cy={yAt(point[3])} r={4} strokeWidth={1.7} style={{ fill: routeColor, stroke: "var(--bg)" }} />
      </g>
    </svg>
  );
}
