"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import catalog from "@/lib/data/marsquakes.json";
import { cssVar, METHODS_URL, prepareCanvas, useElementSize } from "@/lib/hooks";

const SIGNAL_NAMES = {
  BROADBAND: "Broadband", LOW_FREQUENCY: "Low frequency", HIGH_FREQUENCY: "High frequency",
  VERY_HIGH_FREQUENCY: "Very high frequency", "2.4_HZ": "2.4 Hz",
};
const QUALITY_NAMES = { A: "High", B: "Medium", C: "Low", D: "Suspicious" };
const RADIANS = Math.PI / 180;
const AREA_WIDTH = 720;
const AREA_HEIGHT = 360;
const DEFAULT_EVENT = "S1222a";
const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

const available = Boolean(catalog?.events?.length);
const station = catalog?.insight;
const gale = catalog?.gale;
const EVENTS = (catalog?.events ?? []).map(event => ({
  ...event,
  timestamp: Date.parse(event.utc),
  year: event.utc.slice(0, 4),
  location: event.epicenter ? "epicenter" : event.distance ? "distance" : event.bearing !== null ? "bearing" : "none",
}));
const YEARS = [...new Set(EVENTS.map(event => event.year))];

const positionStyle = point => ({ left: `${(point.longitude + 180) / 3.6}%`, top: `${(90 - point.latitude) / 1.8}%` });

function uncertainty(quantity, decimals, unit = "") {
  if (quantity.lower === null && quantity.upper === null) return "";
  if (quantity.lower === quantity.upper) return ` ± ${quantity.lower.toFixed(decimals)}${unit}`;
  const bounds = [];
  if (quantity.lower !== null) bounds.push(`−${quantity.lower.toFixed(decimals)}${unit}`);
  if (quantity.upper !== null) bounds.push(`+${quantity.upper.toFixed(decimals)}${unit}`);
  return ` (${bounds.join(" / ")})`;
}

function magnitude(event) {
  const value = event.magnitude;
  return value ? `Mw ${value.value.toFixed(1)}${uncertainty(value, 1)}` : "Unreported";
}

const coordinate = (number, positive, negative) => `${Math.abs(number).toFixed(2)}° ${number < 0 ? negative : positive}`;

function describeLocation(event) {
  if (event.impact) return "Mars Reconnaissance Orbiter images identify this impact site. The signal grade and magnitude come from the seismic catalog.";
  if (event.epicenter) return "The catalog supplies an epicenter but gives no numerical position bounds for it.";
  if (event.distance) {
    return event.distance.lower !== null || event.distance.upper !== null
      ? "The shaded band covers the catalog’s distance bounds. The direction and epicenter are unknown."
      : "The line shows the estimated distance. The catalog gives no distance bounds or direction.";
  }
  return event.location === "bearing"
    ? "The catalog gives a direction from InSight. Distance and epicenter are unknown."
    : "The catalog gives no epicenter, distance, or direction for this event.";
}

/** Angular distance from InSight for every cell of the equirectangular overlay. */
function distanceGrid() {
  const grid = new Float32Array(AREA_WIDTH * AREA_HEIGHT);
  const lat = station.latitude * RADIANS;
  const east = Array.from({ length: AREA_WIDTH }, (_, col) =>
    Math.cos(((col + 0.5) * 360 / AREA_WIDTH - 180 - station.longitude) * RADIANS));
  for (let row = 0; row < AREA_HEIGHT; row += 1) {
    const angle = (90 - (row + 0.5) * 180 / AREA_HEIGHT) * RADIANS;
    const north = Math.sin(lat) * Math.sin(angle);
    const scale = Math.cos(lat) * Math.cos(angle);
    for (let col = 0; col < AREA_WIDTH; col += 1) {
      const dot = north + scale * east[col];
      grid[row * AREA_WIDTH + col] = Math.acos(Math.max(-1, Math.min(1, dot))) / RADIANS;
    }
  }
  return grid;
}

function drawDistance(canvas, event, gridRef) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, AREA_WIDTH, AREA_HEIGHT);
  if (event?.location !== "distance") return;
  const { value, lower, upper } = event.distance;
  const low = Math.max(0, value - (lower ?? 0));
  const high = Math.min(180, value + (upper ?? 0));
  const image = ctx.createImageData(AREA_WIDTH, AREA_HEIGHT);
  gridRef.current ??= distanceGrid();
  const grid = gridRef.current;
  for (let index = 0; index < grid.length; index += 1) {
    const angle = grid[index];
    const edge = Math.min(Math.abs(angle - low), Math.abs(angle - high)) <= 0.55;
    if (edge || (angle >= low && angle <= high)) image.data.set([161, 219, 224, edge ? 230 : 63], index * 4);
  }
  ctx.putImageData(image, 0, 0);
}

/** Draws the magnitude timeline and returns the point positions for hit-testing. */
function drawTimeline(canvas, width, height, { filtered, selectedIndex, year }) {
  const ctx = prepareCanvas(canvas, width, height, Infinity);
  if (!ctx) return [];
  const palette = {
    accent: cssVar("--accent"), history: cssVar("--history"), ink: cssVar("--ink"),
    muted: cssVar("--muted"), line: cssVar("--line"), bg: cssVar("--bg"),
  };
  const selectedYear = Number(year);
  const firstYear = selectedYear || Number(YEARS[0]);
  const lastYear = selectedYear || Number(YEARS.at(-1));
  const start = Date.UTC(firstYear, 0, 1);
  const end = Date.UTC(lastYear + 1, 0, 1);
  const left = 54;
  const right = width - 16;
  const top = 19;
  const bottom = height - 75;
  const noMagnitude = bottom + 24;
  const x = timestamp => left + (right - left) * (timestamp - start) / (end - start);
  const y = value => bottom - (bottom - top) * (value - 0.5) / 4.5;
  const selected = filtered[selectedIndex];

  ctx.font = "11px monospace";
  ctx.fillStyle = palette.muted;
  ctx.strokeStyle = palette.line;
  const horizontal = (position, label) => {
    ctx.beginPath();
    ctx.moveTo(left, position);
    ctx.lineTo(right, position);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(label, left - 6, position + 4);
  };
  for (let value = 1; value <= 5; value += 1) horizontal(y(value), value);
  ctx.fillStyle = palette.ink;
  ctx.textAlign = "left";
  ctx.fillText("Mw", 9, top + 4);
  ctx.strokeRect(left, noMagnitude - 12, right - left, 24);
  ctx.fillStyle = palette.muted;
  horizontal(noMagnitude, "No Mw");
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  if (selectedYear) {
    const increment = width < 440 ? 3 : 2;
    for (let month = 0; month < 12; month += increment) {
      const timestamp = Date.UTC(selectedYear, month, 1);
      ctx.fillText(monthFormatter.format(timestamp), x(timestamp), height - 22);
    }
  } else {
    for (let item = firstYear; item <= lastYear; item += 1) ctx.fillText(item, x(Date.UTC(item, 0, 1)), height - 22);
  }
  ctx.textAlign = "right";
  ctx.fillText("UTC", right, height - 22);

  const points = filtered.map(event => ({ x: x(event.timestamp), y: event.magnitude ? y(event.magnitude.value) : noMagnitude }));
  const drawPoint = (point, event, active) => {
    const radius = active ? 5 : 2.5;
    ctx.fillStyle = active ? palette.accent : event.impact ? palette.history : palette.ink;
    ctx.beginPath();
    if (event.impact) {
      ctx.moveTo(point.x, point.y - radius);
      ctx.lineTo(point.x + radius, point.y);
      ctx.lineTo(point.x, point.y + radius);
      ctx.lineTo(point.x - radius, point.y);
      ctx.closePath();
    } else {
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    }
    ctx.fill();
    if (active) {
      ctx.strokeStyle = palette.bg;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
  };
  ctx.globalAlpha = 0.38;
  points.forEach((point, index) => drawPoint(point, filtered[index], false));
  ctx.globalAlpha = 1;
  if (!selected) return points;

  const point = points[selectedIndex];
  const value = selected.magnitude;
  ctx.strokeStyle = palette.accent;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(point.x, top);
  ctx.lineTo(point.x, noMagnitude + 12);
  ctx.stroke();
  ctx.setLineDash([]);
  if (value && (value.lower !== null || value.upper !== null)) {
    const low = y(value.value - (value.lower ?? 0));
    const high = y(value.value + (value.upper ?? 0));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(point.x, low);
    ctx.lineTo(point.x, high);
    ctx.moveTo(point.x - 5, low);
    ctx.lineTo(point.x + 5, low);
    ctx.moveTo(point.x - 5, high);
    ctx.lineTo(point.x + 5, high);
    ctx.stroke();
  }
  drawPoint(point, selected, true);
  return points;
}

function QuakeExplorer() {
  const [year, setYear] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedId, setSelectedId] = useState(DEFAULT_EVENT);
  const areaRef = useRef(null);
  const chartRef = useRef(null);
  const gridRef = useRef(null);
  const pointsRef = useRef([]);
  const { width, height } = useElementSize(chartRef);

  const filtered = useMemo(
    () => EVENTS.filter(event => (!year || event.year === year) && (!locationFilter || event.location === locationFilter)),
    [year, locationFilter],
  );
  const selectedIndex = filtered.length ? Math.max(0, filtered.findIndex(event => event.id === selectedId)) : -1;
  const event = filtered[selectedIndex];
  const mapped = filtered.filter(item => item.epicenter);

  useEffect(() => {
    if (areaRef.current) drawDistance(areaRef.current, event, gridRef);
  }, [event]);

  useEffect(() => {
    if (!chartRef.current || !width || !height) return;
    pointsRef.current = drawTimeline(chartRef.current, width, height, { filtered, selectedIndex, year });
  }, [filtered, selectedIndex, year, width, height]);

  // Keep the displayed event selected when the filters change, as long as it still matches.
  const changeFilter = setter => value => {
    setSelectedId(event?.id ?? DEFAULT_EVENT);
    setter(value);
  };
  const selectIndex = index => {
    if (filtered[index]) setSelectedId(filtered[index].id);
  };

  const onChartClick = clickEvent => {
    const bounds = chartRef.current.getBoundingClientRect();
    const x = clickEvent.clientX - bounds.left;
    const y = clickEvent.clientY - bounds.top;
    let closest = -1;
    let limit = 14 ** 2;
    pointsRef.current.forEach((point, index) => {
      const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
      if (distance < limit) {
        closest = index;
        limit = distance;
      }
    });
    if (closest >= 0) selectIndex(closest);
  };

  const distanceText = event && [
    event.distance ? `${event.distance.value.toFixed(2)}°${uncertainty(event.distance, 2, "°")}` : null,
    event.bearing && `${Number(((event.bearing.value + 360) % 360).toFixed(1))}°${uncertainty(event.bearing, 1, "°")} from north`,
  ].filter(Boolean).join(" · ");
  const km = value => value.toLocaleString("en");

  return (
    <div>
      <div className="quake-filters">
        <label>Earth year
          <select value={year} onChange={e => changeFilter(setYear)(e.target.value)}>
            <option value="">All years</option>
            {YEARS.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>Location evidence
          <select value={locationFilter} onChange={e => changeFilter(setLocationFilter)(e.target.value)}>
            <option value="">All events</option>
            <option value="epicenter">Mapped epicenter</option>
            <option value="distance">Distance only</option>
            <option value="bearing">Direction only</option>
            <option value="none">No location estimate</option>
          </select>
        </label>
        <p className="section-note">
          {`${filtered.length.toLocaleString("en")} ${filtered.length === 1 ? "event" : "events"} · ${mapped.length} mapped`}
        </p>
      </div>
      <div className="quake-overview">
        <figure className="quake-globe">
          <div className="quake-map">
            <img src="/data/marsquake-basemap.webp" width={1024} height={512} loading="lazy" alt="Global Mars topography from 180° W to 180° E, north up" />
            <svg viewBox="0 0 360 180" aria-hidden="true">
              <path d="M60 0V180M120 0V180M180 0V180M240 0V180M300 0V180M0 30H360M0 60H360M0 90H360M0 120H360M0 150H360" />
            </svg>
            <canvas id="quake-area" ref={areaRef} width={AREA_WIDTH} height={AREA_HEIGHT} aria-hidden="true"></canvas>
            <div id="quake-markers" role="group" aria-label="Mapped epicenters">
              {mapped.map(item => {
                const label = `${item.id} · ${magnitude(item)}${item.impact ? " · impact" : ""}`;
                return (
                  <button
                    key={item.id} type="button" className={`quake-marker${item.impact ? " is-impact" : ""}`}
                    title={label} aria-label={label} aria-pressed={item.id === event?.id}
                    style={positionStyle(item.epicenter)} onClick={() => setSelectedId(item.id)}
                  />
                );
              })}
            </div>
            <span className="quake-insight" title="InSight lander" aria-hidden="true" style={positionStyle(station)}></span>
            <span id="quake-gale" className="quake-gale" title="Gale Crater center" aria-hidden="true" style={positionStyle(gale)}></span>
          </div>
          <figcaption className="quake-legend">
            <span><i className="quake-dot"></i>Epicenter</span>
            <span><i className="quake-impact"></i>Impact</span>
            <span><i className="quake-station"></i>InSight</span>
            <span><i className="quake-gale"></i>Gale Crater</span>
            <span><i className="quake-range"></i>Selected distance evidence</span>
          </figcaption>
        </figure>
        <article className="quake-event" aria-labelledby="quake-event-title">
          <div className="quake-event-heading">
            <h3 id="quake-event-title">{event?.id ?? "No matching events"}</h3>
            <span>{event ? (event.impact ? "Cataloged impact" : SIGNAL_NAMES[event.signal]) : ""}</span>
          </div>
          <p className="section-note">{event ? `${event.utc.slice(0, 10)} · ${event.utc.slice(11, 19)} UTC` : ""}</p>
          <dl id="quake-event-readings" className="readings" hidden={!event}>
            <div><dt>Moment magnitude</dt><dd>{event ? magnitude(event) : ""}</dd></div>
            <div><dt>Signal quality</dt><dd>{event ? `${event.quality} · ${QUALITY_NAMES[event.quality]}` : ""}</dd></div>
            <div>
              <dt>Epicenter</dt>
              <dd>{event?.epicenter
                ? `${coordinate(event.epicenter.latitude, "N", "S")} · ${coordinate(event.epicenter.longitude, "E", "W")}`
                : "Unresolved"}</dd>
            </div>
            <div><dt>Distance / direction from InSight</dt><dd>{distanceText || "Unreported"}</dd></div>
          </dl>
          <p className="section-note">
            {event ? describeLocation(event) : "Choose a different Earth year or type of location evidence."}
          </p>
        </article>
      </div>
      <div className="quake-timeline">
        <h3>Event timeline</h3>
        <canvas
          id="quake-chart" ref={chartRef} role="img" onClick={onChartClick} aria-describedby="quake-chart-note"
          aria-label="Events by UTC date and moment magnitude, with a separate row for events without a magnitude"
        ></canvas>
        <p id="quake-chart-note" className="section-note">Select a point or use the event controls. The vertical bar shows the selected event’s magnitude uncertainty.</p>
        <div className="quake-navigation">
          <label htmlFor="quake-time">Browse in time order</label>
          <input
            id="quake-time" type="range" min={0} max={Math.max(0, filtered.length - 1)} step={1}
            value={Math.max(0, selectedIndex)} disabled={filtered.length < 2}
            aria-valuetext={event ? `${event.id}, ${event.utc.slice(0, 10)} UTC` : "No matching events"}
            onChange={e => selectIndex(Number(e.target.value))}
          />
          <label className="sr-only" htmlFor="quake-event-select">Catalog event</label>
          <div className="quake-step">
            <button type="button" aria-label="Previous event" disabled={selectedIndex <= 0} onClick={() => selectIndex(selectedIndex - 1)}>‹</button>
            <select id="quake-event-select" value={event?.id ?? ""} disabled={!event} onChange={e => setSelectedId(e.target.value)}>
              {filtered.map(item => (
                <option key={item.id} value={item.id}>
                  {`${item.id} · ${item.utc.slice(0, 10)}${item.magnitude ? ` · Mw ${item.magnitude.value.toFixed(1)}` : ""}`}
                </option>
              ))}
            </select>
            <button type="button" aria-label="Next event" disabled={!event || selectedIndex === filtered.length - 1}
              onClick={() => selectIndex(selectedIndex + 1)}>›</button>
          </div>
        </div>
      </div>
      <p role="status" className="sr-only">
        {event
          ? `${event.id}, ${event.utc.slice(0, 10)} UTC. Magnitude ${magnitude(event)}. ${describeLocation(event)}`
          : "No events match these filters."}
      </p>
      <p className="section-note">A shaded band shows the published distance bounds in every direction. A narrow line shows an estimated distance when the archive gives no bounds. Some events have only a direction or no location estimate.</p>
      <section className="quake-gale-context" aria-labelledby="quake-gale-title">
        <h3 id="quake-gale-title">What InSight tells us about Gale</h3>
        <p className="section-note">
          {`InSight was about ${km(gale.stationKm)} km from Gale’s center. This map shows ${gale.inside} cataloged sources within Gale’s approximate rim. The nearest plotted impact (${gale.nearest.id}) was about ${km(gale.nearest.km)} km from the crater center. The nearest plotted seismic epicenter (${gale.nearestNonImpact.id}) was about ${km(gale.nearestNonImpact.km)} km away.`}
        </p>
        <p className="section-note">InSight measured shaking at one station in Elysium Planitia. Many located events cluster near Cerberus Fossae, east of the lander. Many other records give a distance without a direction. The catalog leaves Gale’s local shaking and quake frequency unresolved.</p>
      </section>
      <div className="data-links">
        <a href="/data/marsquakes.csv" download>Download events CSV</a>
        <a href="https://pds.nasa.gov/ds-view/pds/viewCollection.jsp?identifier=urn%3Anasa%3Apds%3Ainsight_seis%3Adata_derived">NASA PDS catalog</a>
        <a href={`${METHODS_URL}#marsquakes`}>Catalog and map methods</a>
        <a href="https://planetarynames.wr.usgs.gov/Feature/Gale">USGS Gale Crater reference</a>
        <a href="https://doi.org/10.1029/2023JE007826">InSight seismicity study</a>
      </div>
    </div>
  );
}

export default function QuakeSection() {
  return (
    <section className="detail-panel" id="marsquakes" aria-labelledby="marsquakes-title">
      <div className="detail-heading">
        <div>
          <h2 id="marsquakes-title">Marsquakes</h2>
          <p>Explore seismic signals NASA’s InSight lander recorded from 2019 to 2022. The map shows estimated quake sources and impact sites identified in orbital images.</p>
        </div>
        <span className="data-tag">InSight · Catalog V14</span>
      </div>
      {available ? <QuakeExplorer /> : <p className="section-note">The bundled InSight catalog could not be loaded.</p>}
    </section>
  );
}
