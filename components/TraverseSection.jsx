"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import survey from "@/lib/data/survey.json";
import water from "@/lib/data/water-isru.json";
import { linePath, useElementSize } from "@/lib/hooks";
import ProfileChart from "./ProfileChart";

const [WIDTH, HEIGHT] = survey.size;

// three.js loads only when someone opens the 3D view.
const Terrain3D = dynamic(() => import("./Terrain3D"), {
  ssr: false,
  loading: () => <div className="terrain-3d" data-status="loading"><p className="terrain-status">Loading 3D terrain…</p></div>,
});
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.45;


function clampView({ x, y, zoom }) {
  const w = WIDTH / zoom;
  const h = HEIGHT / zoom;
  return {
    zoom,
    x: Math.min(Math.max(0, x), WIDTH - w),
    y: Math.min(Math.max(0, y), HEIGHT - h),
  };
}

function MapLabel({ x, y, children, anchor = "start" }) {
  return (
    <text
      x={x} y={y} textAnchor={anchor} fontSize={4.7} className="map-label"
      fontWeight={700} paintOrder="stroke" strokeWidth={1.3} strokeLinejoin="round"
      style={{ fill: "var(--ink)", stroke: "var(--bg)" }}
    >
      {children}
    </text>
  );
}

const hazardPath = linePath(survey.hazard) + "Z";
const historyPath = linePath(survey.history);
const routePaths = Object.fromEntries(Object.entries(survey.routes).map(([name, route]) => [name, linePath(route.path)]));

const danPoints = water?.dan ?? [];
// Draw active samples above passive samples where the archive uses the same center.
const danOrdered = [...danPoints.filter(point => point.mode === "Passive"), ...danPoints.filter(point => point.mode === "Active")];
const danEstimate = point => `${point.weh.toFixed(2)} ± ${point.uncertainty.toFixed(2)} wt% WEH`;

function DanMarker({ point, selected, onSelect }) {
  const className = `dan-marker dan-${point.mode.toLowerCase()}${selected ? " dan-selected" : ""}`;
  const title = <title>{`${point.mode} DAN ${point.id} · ${danEstimate(point)}`}</title>;
  const onClick = () => onSelect(point.id);
  return point.mode === "Active" ? (
    <circle cx={point.x} cy={point.y} r={2} className={className} vectorEffect="non-scaling-stroke" onClick={onClick}>{title}</circle>
  ) : (
    <rect x={point.x - 0.85} y={point.y - 0.85} width={1.7} height={1.7} className={className}
      vectorEffect="non-scaling-stroke" onClick={onClick}>{title}</rect>
  );
}

export default function TraverseSection({
  mapRef, mapMode, onMapModeChange, routeName, onRouteChange, layers, onLayerChange, danAvailable, selectedDanId, onSelectDan,
}) {
  const is3d = mapMode === "3d";
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [profileIndex, setProfileIndex] = useState(0);
  const [readout, setReadout] = useState("Move across the map to inspect coordinates");
  const [panning, setPanning] = useState(false);
  const drag = useRef(null);
  const { width: mapWidth } = useElementSize(mapRef);

  const route = survey.routes[routeName];
  const index = Math.min(profileIndex, route.profile.length - 1);
  const point = route.profile[index];
  const w = WIDTH / view.zoom;
  const h = HEIGHT / view.zoom;
  const scaleWidth = mapWidth ? 25 * mapWidth / (w * survey.eastScale) : 0;

  const orderedDan = useMemo(() => {
    const selected = danOrdered.find(item => item.id === selectedDanId);
    return selected ? [...danOrdered.filter(item => item !== selected), selected] : danOrdered;
  }, [selectedDanId]);

  const selectRoute = name => {
    onRouteChange(name);
    setProfileIndex(0);
  };

  const zoom = factor => setView(current => {
    const centerX = current.x + WIDTH / (2 * current.zoom);
    const centerY = current.y + HEIGHT / (2 * current.zoom);
    const next = Math.min(MAX_ZOOM, Math.max(1, current.zoom * factor));
    return clampView({ zoom: next, x: centerX - WIDTH / (2 * next), y: centerY - HEIGHT / (2 * next) });
  });

  const onKeyDown = event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction || view.zoom === 1) return;
    event.preventDefault();
    setView(current => clampView({
      zoom: current.zoom,
      x: current.x + direction[0] * WIDTH / (8 * current.zoom),
      y: current.y + direction[1] * HEIGHT / (8 * current.zoom),
    }));
  };

  const onPointerDown = event => {
    if (event.button !== 0 || view.zoom === 1 || event.target.closest(".dan-marker")) return;
    drag.current = { screenX: event.clientX, screenY: event.clientY, x: view.x, y: view.y };
    mapRef.current.setPointerCapture(event.pointerId);
    setPanning(true);
  };

  const onPointerMove = event => {
    const bounds = mapRef.current.getBoundingClientRect();
    const scale = WIDTH / (bounds.width * view.zoom);
    let { x, y } = view;
    if (drag.current) {
      const next = clampView({
        zoom: view.zoom,
        x: drag.current.x - (event.clientX - drag.current.screenX) * scale,
        y: drag.current.y - (event.clientY - drag.current.screenY) * scale,
      });
      ({ x, y } = next);
      setView(next);
    }
    const lon = (survey.origin[0] + x + (event.clientX - bounds.left) * scale) / survey.metresPerDegree;
    const lat = (survey.origin[1] - y - (event.clientY - bounds.top) * scale) / survey.metresPerDegree;
    setReadout(`${Math.abs(lat).toFixed(5)}° ${lat < 0 ? "S" : "N"} · ${lon.toFixed(5)}° E`);
  };

  const endDrag = () => {
    drag.current = null;
    setPanning(false);
  };

  const display = name => (layers[name] ? "inline" : "none");
  const mapClass = [view.zoom > 1 && "can-pan", panning && "is-panning"].filter(Boolean).join(" ") || undefined;
  const routeNote = routeName === "detour"
    ? `Skirts the mapped dune with at least ${Math.floor(route.clearance)} m clearance. Metrics cover the outbound leg.`
    : `Crosses ${Math.round(route.hazardDistance)} m of the dune exclusion zone. Shown for comparison.`;

  return (
    <div className="layout">
      <section className="survey" aria-label="Marswalk map and elevation profile">
        <div className="toolbar">
          <h2>Traverse map</h2>
          <div className="view-toggle" role="group" aria-label="Map view">
            <button type="button" aria-pressed={!is3d} onClick={() => onMapModeChange("2d")}>2D map</button>
            <button type="button" aria-pressed={is3d} onClick={() => onMapModeChange("3d")}>3D terrain</button>
          </div>
          <div className="zoom" aria-label="Map zoom" hidden={is3d}>
            <button type="button" aria-label="Zoom out" disabled={view.zoom <= 1} onClick={() => zoom(1 / ZOOM_STEP)}>−</button>
            <button type="button" aria-label="Zoom in" disabled={view.zoom >= MAX_ZOOM} onClick={() => zoom(ZOOM_STEP)}>+</button>
            <button type="button" aria-label="Reset map view" onClick={() => setView({ x: 0, y: 0, zoom: 1 })}>Reset</button>
          </div>
        </div>
        <div className="map-frame">
          {is3d ? (
            <Terrain3D routeName={routeName} profileIndex={index} onInspect={setProfileIndex} layers={layers} />
          ) : (<>
          <svg
            id="map" ref={mapRef} className={mapClass} role="img" tabIndex={0}
            viewBox={`${view.x} ${view.y} ${w} ${h}`}
            aria-label="North-up orbital map showing the proposed detour, direct comparison, and Namib Dune. Use arrow keys to pan after zooming."
            onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onLostPointerCapture={endDrag}
          >
            <defs>
              <pattern id="hazard-lines" width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <path d="M0 0V5" strokeWidth={1.25} opacity={0.65} style={{ stroke: "var(--hazard)" }} />
              </pattern>
            </defs>
            <g data-map-layer="imagery" display={display("imagery")}>
              <image href="/data/imagery.webp" width={WIDTH} height={HEIGHT} />
            </g>
            <g data-map-layer="slope" display={display("slope")}>
              <image href="/data/slope.png" width={WIDTH} height={HEIGHT} opacity={0.88} />
            </g>
            <g data-map-layer="contours" display={display("contours")} fill="none" opacity={0.43} style={{ stroke: "var(--ink)" }}>
              {survey.contours.map((contour, i) => (
                <path key={i} d={contour.path} strokeWidth={contour.major ? 1.05 : 0.48} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
            <g data-map-layer="hazard" display={display("hazard")}>
              <path d={hazardPath} fillOpacity={0.14} strokeWidth={1.35} vectorEffect="non-scaling-stroke"
                style={{ fill: "var(--hazard)", stroke: "var(--hazard)" }} />
              <path d={hazardPath} fill="url(#hazard-lines)" />
              <MapLabel x={survey.duneLabel[0]} y={survey.duneLabel[1]} anchor="middle">Namib Dune</MapLabel>
            </g>
            <g data-map-layer="history" display={display("history")}>
              <path d={historyPath} fill="none" strokeWidth={1.7} strokeDasharray="2 3" vectorEffect="non-scaling-stroke"
                style={{ stroke: "var(--history)" }} />
            </g>
            <g data-map-layer="dan" display={display("dan")}>
              {orderedDan.map(item => (
                <DanMarker key={item.id} point={item} selected={item.id === selectedDanId} onSelect={onSelectDan} />
              ))}
            </g>
            <g data-map-layer="routes" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {["direct", "detour"].map(name => {
                const isDirect = name === "direct";
                const opacity = name === routeName ? 1 : isDirect ? 0.69 : 0.36;
                return (
                  <g key={name} opacity={opacity}>
                    <path d={routePaths[name]} strokeWidth={5.2} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--bg)" }} />
                    <path d={routePaths[name]} strokeWidth={isDirect ? 2 : 3} strokeDasharray={isDirect ? "5 5" : "none"}
                      vectorEffect="non-scaling-stroke" style={{ stroke: isDirect ? "var(--direct)" : "var(--accent)" }} />
                  </g>
                );
              })}
            </g>
            <g data-map-layer="stops">
              {survey.stops.map(stop => (
                <g key={stop.label}>
                  <circle cx={stop.x} cy={stop.y} r={2.1} strokeWidth={2} vectorEffect="non-scaling-stroke"
                    style={{ fill: "var(--bg)", stroke: "var(--accent)" }} />
                  <MapLabel x={stop.x + stop.dx} y={stop.y + stop.dy} anchor={stop.anchor}>{stop.label}</MapLabel>
                </g>
              ))}
              <circle cx={point[1]} cy={point[2]} r={2.55} strokeWidth={2} vectorEffect="non-scaling-stroke" pointerEvents="none"
                style={{ fill: "var(--ink)", stroke: "var(--bg)" }} />
            </g>
          </svg>
          <div className="map-key" aria-hidden="true">
            <div className="north">↑ <strong>N</strong></div>
            <div id="scale"><span style={{ width: `${scaleWidth}px` }}></span><strong>25 m</strong></div>
          </div>
          <div className="map-readout">{readout}</div>
          </>)}
        </div>
        <section className="profile" aria-labelledby="profile-title">
          <div className="profile-top">
            <div>
              <h2 id="profile-title">Elevation profile</h2>
              <p>Elevation relative to the MOLA areoid</p>
            </div>
            <output>{`${point[0].toFixed(1)} m · ${point[3].toFixed(1)} m`}</output>
          </div>
          <ProfileChart route={route} routeName={routeName} index={index} onInspect={setProfileIndex} />
          <label htmlFor="profile-position" className="sr-only">Distance along the selected route</label>
          <input
            id="profile-position" type="range" min={0} max={route.profile.length - 1} step={1} value={index}
            aria-valuetext={`${Math.round(point[0])} meters along route, elevation ${point[3]} meters`}
            onChange={event => setProfileIndex(Number(event.target.value))}
          />
        </section>
      </section>
      <aside>
        <section className="side-panel">
          <h2>Route comparison</h2>
          <div className="route-controls" aria-label="Select profile route">
            {["detour", "direct"].map(name => (
              <button key={name} type="button" aria-pressed={routeName === name} onClick={() => selectRoute(name)}>
                {name === "detour" ? "Detour" : "Direct"}
              </button>
            ))}
          </div>
          <dl className="stats">
            <div><dt>Distance</dt><dd>{`${Math.round(route.distance)} m`}</dd></div>
            <div><dt>Ascent</dt><dd>{`${route.ascent.toFixed(1)} m`}</dd></div>
            <div><dt>Peak slope</dt><dd>{`${route.peakGrade.toFixed(1)}°`}</dd></div>
          </dl>
          <p className="explanation">{routeNote}</p>
          <a className="route-plan-link" href="#return">Check return budget ↓</a>
        </section>
        <section className="side-panel">
          <h2>Layers</h2>
          {[
            ["imagery", "imagery", "HiRISE imagery"],
            ["contours", "contour", "2 m elevation contours"],
            ["slope", "slope", "Terrain slope"],
          ].map(([name, swatch, label]) => (
            <label key={name} className="layer">
              <span className={`swatch ${swatch}`}></span>{label}
              <input type="checkbox" checked={layers[name]} onChange={event => onLayerChange(name, event.target.checked)} />
            </label>
          ))}
          <div className="slope-legend" hidden={!layers.slope}><span>15–20°</span> <span>20–30°</span> <span>30°+</span></div>
          {[
            ["hazard", "hazard", "Dune exclusion zone"],
            ["history", "track", "Curiosity rover track"],
            ["dan", "dan", "Curiosity DAN samples"],
          ].map(([name, swatch, label]) => (
            <label key={name} className="layer">
              <span className={`swatch ${swatch}`}></span>{label}
              <input type="checkbox" checked={layers[name]} disabled={name === "dan" && !danAvailable}
                onChange={event => onLayerChange(name, event.target.checked)} />
            </label>
          ))}
          <p className="coverage-note"><a href="#water">Water evidence and coverage ↓</a></p>
          <p className="coverage-note">Dark gaps at the mosaic edges show missing imagery.</p>
        </section>
        <section className="side-panel science">
          <h2>Gobabeb science stop</h2>
          <img src="/data/namib-surface.webp" width={1000} height={241} loading="lazy" decoding="async" alt="Curiosity view of ripples and the steep downwind face of Namib Dune" />
          <p>Curiosity sampled wind-sorted sand at the dune margin on sol 1225.</p>
          <a href="#gobabeb">Explore the observations ↓</a>
        </section>
      </aside>
    </div>
  );
}
