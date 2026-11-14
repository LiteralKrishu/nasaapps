"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { METHODS_URL, useElementSize } from "@/lib/hooks";
import {
  SIGNAL_NAMES,
  QUALITY_NAMES,
  AREA_WIDTH,
  AREA_HEIGHT,
  DEFAULT_EVENT,
  available,
  station,
  gale,
  EVENTS,
  YEARS,
  positionStyle,
  uncertainty,
  magnitude,
  coordinate,
  describeLocation,
  drawDistance,
  drawTimeline,
} from "@/lib/quakes";

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
