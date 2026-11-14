"use client";

import { useEffect, useRef, useState } from "react";
import dataset from "@/lib/data/solar-storm.json";
import { canvasFont, cssVar, METHODS_URL, niceStep, prepareCanvas, useElementSize } from "@/lib/hooks";

const available = Boolean(dataset?.rows?.length);
const rows = dataset?.rows ?? [];
const interval = (dataset?.windowMinutes ?? 30) * 60_000;
const start = available ? Date.parse(dataset.start) : 0;
const background = dataset?.radBackground?.value;
const eventIndex = available ? (Date.parse(dataset.eventDay) - start) / interval : 0;
const windowsPerDay = 86_400_000 / interval;
const last = Math.max(0, rows.length - 1);
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const clockFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const counts = new Intl.NumberFormat("en");
const NAV_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];

const TRACKS = [
  { key: "rad", offset: 0, label: "Curiosity RAD absorbed dose rate in micrograys per day", unit: "µGy/day", decimals: 1, color: "--accent" },
  { key: "maven", offset: 2, label: "MAVEN SEP 2.24 MeV differential ion flux", unit: "ions/(cm²·s·sr·keV)", decimals: 4, color: "--history" },
].map(track => {
  const values = rows.map(row => row[track.offset]);
  const max = Math.max(...values.filter(value => value !== null), 0);
  const step = niceStep(max / 4 || 1);
  return { ...track, values, step, ticks: Math.max(1, Math.ceil(max / step)) };
});

const timestamp = index => start + index * interval;

function windowLabel(index) {
  const from = timestamp(index);
  const to = timestamp(index + 1);
  const day = dateFormat.format(from);
  const endDay = dateFormat.format(to);
  return `${day}, ${clockFormat.format(from)}–${endDay === day ? "" : endDay + ", "}${clockFormat.format(to)} UTC`;
}

function reading(track, value) {
  if (value === null) return "No data";
  const minimum = 10 ** -track.decimals;
  const amount = value > 0 && value < minimum
    ? "<" + minimum.toFixed(track.decimals)
    : value.toLocaleString("en", { maximumFractionDigits: track.decimals });
  return `${amount} ${track.unit}`;
}

function drawTrack(canvas, width, height, track, selected) {
  const ctx = prepareCanvas(canvas, width, height);
  if (!ctx) return;
  const { step, ticks } = track;
  ctx.font = canvasFont(11);
  const left = 52;
  const right = width - 13;
  const top = 15;
  const bottom = height - 29;
  const x = position => left + (right - left) * position / rows.length;
  const y = value => bottom - (bottom - top) * value / (step * ticks);
  const tickDecimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-8));
  const line = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  ctx.fillStyle = cssVar("--hazard");
  ctx.globalAlpha = 0.12;
  ctx.fillRect(x(eventIndex), top, x(eventIndex + windowsPerDay) - x(eventIndex), bottom - top);
  ctx.globalAlpha = 1;
  ctx.fillStyle = cssVar("--muted");
  ctx.strokeStyle = cssVar("--line");
  ctx.textAlign = "right";
  for (let i = 0; i <= ticks; i++) {
    const value = step * i;
    line(left, y(value), right, y(value));
    ctx.fillText(value.toFixed(tickDecimals), left - 6, y(value) + 4);
  }
  ctx.textAlign = "left";
  for (let index = 0; index < rows.length; index += windowsPerDay) {
    line(x(index), top, x(index), bottom);
    ctx.fillText(dateFormat.format(timestamp(index)), x(index) + 3, bottom + 17);
  }
  if (track.key === "rad") {
    ctx.strokeStyle = cssVar("--muted");
    ctx.setLineDash([5, 3]);
    line(left, y(background), right, y(background));
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = ctx.fillStyle = cssVar(track.color);
  ctx.lineWidth = 1.5;
  let previous = null;
  for (const [index, value] of track.values.entries()) {
    if (value === null) {
      previous = null;
      continue;
    }
    const px = x(index + 0.5);
    const py = y(value);
    if (previous) line(previous[0], previous[1], px, py);
    ctx.fillRect(px - 1, py - 1, 2, 2);
    previous = [px, py];
  }
  const cursor = x(selected + 0.5);
  ctx.strokeStyle = cssVar("--ink");
  ctx.setLineDash([3, 4]);
  line(cursor, top, cursor, bottom);
  ctx.setLineDash([]);
  const value = track.values[selected];
  if (value !== null) {
    ctx.beginPath();
    ctx.arc(cursor, y(value), 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function TrackChart({ track, selected }) {
  const ref = useRef(null);
  const { width, height } = useElementSize(ref);
  useEffect(() => {
    if (ref.current && width && height) drawTrack(ref.current, width, height, track, selected);
  }, [track, selected, width, height]);
  const count = rows[selected][track.offset + 1];
  return (
    <section aria-labelledby={`storm-${track.key}-title`}>
      <div className="storm-track-heading">
        {track.key === "rad" ? (
          <div><h3 id="storm-rad-title">Curiosity RAD · surface</h3><p>Detector E absorbed dose rate</p></div>
        ) : (
          <div><h3 id="storm-maven-title">MAVEN SEP · orbit</h3><p>Forward ion flux at 2.24 MeV · sensor 1</p></div>
        )}
        <div>
          <strong id={`storm-${track.key}-value`}>{reading(track, track.values[selected])}</strong>
          <span>{count ? `${counts.format(count)} accepted ${count === 1 ? "sample" : "samples"}` : "No accepted samples"}</span>
        </div>
      </div>
      <canvas ref={ref} className="storm-chart" role="img" aria-describedby="storm-method"
        aria-label={`${track.label}, 19–22 May 2024 UTC. Values are available in the replay measurements table.`}></canvas>
    </section>
  );
}

export default function StormSection() {
  const [selected, setSelected] = useState(0);
  const [playRequested, setPlaying] = useState(false);
  // Playback stops by itself on the last window.
  const playing = playRequested && selected < last;
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setSelected(current => Math.min(last, current + 1)), 180);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const select = (index, announce = false) => {
    const next = Math.max(0, Math.min(last, index));
    setSelected(next);
    if (announce) {
      setAnnouncement(`${windowLabel(next)}. RAD ${reading(TRACKS[0], TRACKS[0].values[next])}. MAVEN ${reading(TRACKS[1], TRACKS[1].values[next])}.`);
    }
  };
  const pauseThen = action => () => {
    setPlaying(false);
    action();
  };

  const heading = (
    <div className="detail-heading">
      <div>
        <h2 id="storm-title">May 2024 solar storm replay</h2>
        <p>Compare Curiosity’s surface radiation with MAVEN’s orbital particle flux. Curiosity recorded the storm elsewhere in Gale Crater, years after its visit to Namib Dune.</p>
      </div>
      <span className="data-tag">19–22 May 2024 · UTC</span>
    </div>
  );

  if (!available) {
    return (
      <section className="detail-panel" id="solar-storm" aria-labelledby="storm-title">
        {heading}
        <p className="section-note">The bundled storm records could not be loaded.</p>
      </section>
    );
  }

  const period = windowLabel(selected);
  const radTrack = TRACKS[0];
  const peakTime = Date.parse(dataset.radPeak.time);
  const peakClock = dataset.radPeak.time.slice(11, 19);

  return (
    <section className="detail-panel" id="solar-storm" aria-labelledby="storm-title">
      {heading}
      <div>
        <dl className="readings storm-readings">
          <div><dt>Pre-storm surface background · May 15–19</dt><dd>{reading(radTrack, background)}</dd></div>
          <div><dt>Peak surface dose rate · May 20</dt><dd>{reading(radTrack, dataset.radPeak.value)}</dd></div>
          <div><dt>Peak compared with background</dt><dd>{`${(dataset.radPeak.value / background).toFixed(1)}×`}</dd></div>
        </dl>
        <div className="storm-controls" role="group" aria-label="Storm playback">
          <button type="button" onClick={() => {
            if (playing) {
              setPlaying(false);
              return;
            }
            if (selected === last) select(0);
            setPlaying(true);
          }}>{playing ? "Pause replay" : "Play replay"}</button>
          <button type="button" aria-label="Previous 30-minute window" disabled={selected === 0}
            onClick={pauseThen(() => select(selected - 1, true))}>‹</button>
          <button type="button" aria-label="Next 30-minute window" disabled={selected === last}
            onClick={pauseThen(() => select(selected + 1, true))}>›</button>
          <button type="button" onClick={pauseThen(() => select(dataset.radPeak.window, true))}>Jump to RAD peak</button>
        </div>
        <div className="storm-timeline">
          <div><label htmlFor="storm-time">Replay window</label><span id="storm-window">{period}</span></div>
          <input
            id="storm-time" type="range" min={0} max={last} step={1} value={selected} aria-valuetext={period}
            onChange={event => { setPlaying(false); select(Number(event.target.value), true); }}
            onPointerDown={() => setPlaying(false)}
            onKeyDown={event => { if (NAV_KEYS.includes(event.key)) setPlaying(false); }}
          />
          <div className="storm-days"><span>19 May</span><span>20 May</span><span>21 May</span><span>22 May</span></div>
        </div>
        <div className="storm-tracks">
          {TRACKS.map(track => <TrackChart key={track.key} track={track} selected={selected} />)}
        </div>
        <p id="storm-method" className="section-note">The charts show 30-minute UTC means. The shaded band marks May 20. The dashed horizontal line shows the median of Curiosity’s May 15–19 readings. MAVEN gaps show where no readings pass the archive filters and instrument settings used here. The orbital track measures ion flux in one direction and energy band.</p>
        <p className="section-note">
          {`The peak is a single RAD observation at ${peakClock} UTC on ${dateFormat.format(peakTime)}. The background uses ${counts.format(dataset.radBackground.samples)} observations.`}
        </p>
        <p className="sr-only" role="status">{announcement}</p>
        <details className="storm-data">
          <summary>View replay measurements</summary>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Storm measurements table">
            <table className="data-table weather-table">
              <caption>30-minute means and accepted sample counts</caption>
              <thead>
                <tr><th scope="col">Window start · UTC</th><th scope="col">RAD · µGy/day (n)</th><th scope="col">SEP · ions/(cm²·s·sr·keV) (n)</th></tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const stamp = timestamp(index);
                  return (
                    <tr key={index}>
                      <th scope="row">{`${dateFormat.format(stamp)} ${clockFormat.format(stamp)}`}</th>
                      {TRACKS.map(track => {
                        const value = row[track.offset];
                        return <td key={track.key}>{value === null ? "—" : `${value} (${counts.format(row[track.offset + 1])})`}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
        <div className="data-links">
          <a href="/data/solar-storm.csv" download>Download replay CSV</a>
          <a href="https://spdf.gsfc.nasa.gov/pub/data/aaa_planetary/msl/rad/cdf/obs-l2/2024/">NASA RAD data</a>
          <a href="https://spdf.gsfc.nasa.gov/pub/data/maven/sep/l2/s1-cal-svy-full/2024/05/">NASA MAVEN SEP data</a>
          <a href="https://www.jpl.nasa.gov/news/nasa-watches-mars-light-up-during-epic-solar-storm/">JPL event report</a>
          <a href={`${METHODS_URL}#solar-storm-replay`}>Replay data and filters</a>
        </div>
      </div>
    </section>
  );
}
