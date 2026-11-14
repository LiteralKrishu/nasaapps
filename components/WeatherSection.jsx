"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import data from "@/lib/data/weather.json";
import { canvasFont, cssVar, METHODS_URL, niceStep, prepareCanvas, useElementSize } from "@/lib/hooks";

const SERIES = [
  { name: "Air temperature", short: "Air", unit: "°C", color: "--history" },
  { name: "Ground brightness temperature", short: "Ground", unit: "°C", color: "--accent" },
  { name: "Pressure", short: "Pressure", unit: "Pa", color: "--history" },
  { name: "Horizontal wind speed", short: "Wind", unit: "m/s", color: "--history" },
];
const SELECTIONS = { temperature: [0, 1], pressure: [2], wind: [3] };
const MEASUREMENTS = [["temperature", "Temperature"], ["pressure", "Pressure"], ["wind", "Wind"]];
const GROUPS = ["Phase 1 · High Dune and Namib", "Phase 2 · Nathan Bridges Dune and Mount Desert Island"];
const dateFormat = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

const available = Boolean(data?.sols?.length);
const sols = new Map((data?.sols ?? []).map((item, index) => [item.sol, { ...item, index }]));
const lastIndex = available ? data.sols.length - 1 : 0;
const phaseEnd = available ? data.phases[0][1] - data.phases[0][0] : 0;

function clock(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function locationFor(day) {
  if (day >= data.phases[1][0]) return "Nathan Bridges Dune and Mount Desert Island";
  if (day < 1181) return "Approach to High Dune";
  if (day <= 1195) return "High Dune and approach to Namib";
  if (day <= 1215) return "Namib slip face";
  if (day <= 1220) return "Drive to Gobabeb";
  if (day <= 1244) return "Gobabeb area";
  return "Departure from Namib";
}

function campaignTracks(selected) {
  if (selected === "temperature") {
    return SELECTIONS.temperature.map(index => ({
      ...SERIES[index],
      values: data.sols.map(entry => entry.daily?.values.slice(index * 2, index * 2 + 2) || [null, null]),
    }));
  }
  const values = data.sols.map(entry => {
    if (selected === "pressure") return [entry.daily?.values[4] ?? null];
    const [total, count] = entry.bins.reduce(([sum, n], row) => [sum + row[3][0] * row[3][1], n + row[3][1]], [0, 0]);
    return [count ? total / count : null];
  });
  return [{ ...SERIES[SELECTIONS[selected][0]], values }];
}

function drawChart(canvas, width, height, { sol, tracks, campaign }) {
  const ctx = prepareCanvas(canvas, width, height);
  if (!ctx) return;
  ctx.font = canvasFont(11);
  ctx.fillStyle = cssVar("--muted");
  const values = tracks.flatMap(track => track.values.flat()).filter(value => value !== null);
  if (!values.length) {
    ctx.fillText("No usable observations", 18, 30);
    return;
  }
  const unit = tracks[0].unit;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = niceStep((max - min) / 4 || 1);
  const low = Math.floor(min / step) * step;
  const high = Math.max(low + step, Math.ceil(max / step) * step);
  const left = 66;
  const right = width - 18;
  const top = 20;
  const bottom = height - 30;
  const decimalPlaces = Math.max(0, -Math.floor(Math.log10(step) + 1e-8));
  const x = fraction => left + (right - left) * fraction;
  const y = value => bottom - (bottom - top) * (value - low) / (high - low);
  ctx.strokeStyle = cssVar("--line");

  for (let tick = 0; tick <= Math.round((high - low) / step); tick++) {
    const value = low + tick * step;
    ctx.beginPath();
    ctx.moveTo(left, y(value));
    ctx.lineTo(right, y(value));
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(`${value.toFixed(decimalPlaces)} ${unit}`, left - 7, y(value) + 4);
  }
  const labelInterval = width < 540 ? 6 : 3;
  const labels = campaign
    ? [0, phaseEnd, lastIndex].map(index => [index / lastIndex, `Sol ${data.sols[index].sol}`])
    : Array.from({ length: 24 / labelInterval + 1 }, (_, i) => [i * labelInterval / 24, clock(i * labelInterval * 60)]);
  for (const [position, label] of labels) {
    ctx.textAlign = position === 1 ? "right" : position === 0 ? "left" : "center";
    ctx.fillText(label, x(position), bottom + 18);
  }
  if (campaign) {
    for (const [position, style] of [[(phaseEnd + 0.5) / lastIndex, "--muted"], [sol.index / lastIndex, "--ink"]]) {
      ctx.strokeStyle = cssVar(style);
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x(position), top);
      ctx.lineTo(x(position), bottom);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  for (const track of tracks) {
    ctx.strokeStyle = ctx.fillStyle = cssVar(track.color);
    ctx.lineWidth = 1.6;
    let previous;
    track.values.forEach(([value, upper], bin) => {
      if (value === null) {
        previous = undefined;
        return;
      }
      const cx = x(campaign ? bin / lastIndex : (bin + 0.5) * data.binMinutes / 1440);
      const cy = y(value);
      if (upper !== undefined && upper !== null) {
        ctx.globalAlpha = 0.57;
        const offset = track.short === "Air" ? -1.2 : 1.2;
        ctx.fillRect(cx + offset - 1, y(upper), 2, Math.max(1, cy - y(upper)));
        ctx.globalAlpha = 1;
      } else if (previous && (!campaign || bin !== phaseEnd + 1)) {
        ctx.beginPath();
        ctx.moveTo(...previous);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }
      if (upper === undefined) {
        ctx.beginPath();
        ctx.arc(cx, cy, campaign ? 1.9 : 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      previous = [cx, cy];
    });
  }
}

function Unavailable() {
  return (
    <section className="detail-panel" id="weather" aria-labelledby="weather-title">
      <div className="detail-heading">
        <div><h2 id="weather-title">Historical Curiosity weather</h2></div>
      </div>
      <p className="section-note">The local weather archive could not be loaded.</p>
    </section>
  );
}

export default function WeatherSection({ sol: requestedSol, onSolChange, view, onViewChange }) {
  const [selected, setSelected] = useState("temperature");
  const chartRef = useRef(null);
  const { width, height } = useElementSize(chartRef);

  const day = available && sols.has(requestedSol) ? requestedSol : data?.sols?.[0]?.sol;
  const sol = sols.get(day);
  const campaign = view === "campaign";

  const tracks = useMemo(() => {
    if (!sol) return [];
    return campaign ? campaignTracks(selected) : SELECTIONS[selected].map(index => ({
      ...SERIES[index], values: sol.bins.map(row => [row[index][0]]),
    }));
  }, [sol, selected, campaign]);

  useEffect(() => {
    if (!sol || !chartRef.current || !width) return;
    drawChart(chartRef.current, width, height, { sol, tracks, campaign });
  }, [sol, tracks, campaign, width, height]);

  if (!available) return <Unavailable />;

  const jump = index => onSolChange(data.sols[index].sol);
  const date = sol.daily?.date || sol.startUtc;
  const dateLabel = date && !Number.isNaN(Date.parse(date)) ? ` · ${dateFormat.format(new Date(date))}` : "";
  const phase2 = day >= data.phases[1][0];
  const hasBins = Array.isArray(sol.bins) && sol.bins.length > 0;
  const hasDailyReport = sol.daily?.values.some(value => value !== null);
  const resolution = hasBins ? "30-minute data available" : "Daily summary only";
  const context = `Sol ${day} · ${locationFor(day)}${dateLabel} · ${hasBins || hasDailyReport ? resolution : "No weather observations"}`;

  const summary = SELECTIONS[selected].map(index => {
    const metric = SERIES[index];
    const values = sol.bins.map(row => row[index][0]).filter(value => value !== null);
    const samples = sol.bins.reduce((sum, row) => sum + row[index][1], 0);
    const daily = sol.daily?.values ?? [];
    const dailyRange = index < 2 ? daily.slice(index * 2, index * 2 + 2) : index === 2 ? daily.slice(4, 5) : [];
    const hasDaily = dailyRange.length > 0 && dailyRange.every(value => value !== null);
    return {
      ...metric,
      value: values.length
        ? `${Math.min(...values).toFixed(1)} to ${Math.max(...values).toFixed(1)} ${metric.unit}`
        : hasDaily ? `${dailyRange.join(" to ")} ${metric.unit}` : "No usable readings",
      coverage: values.length
        ? `Range of window means · ${values.length} of ${sol.bins.length} windows · ${samples.toLocaleString("en")} readings`
        : hasDaily ? `NASA daily report · ${index === 2 ? "reported pressure" : "minimum to maximum"}` : "",
    };
  });

  const hasData = SELECTIONS[selected].some(index => sol.bins.some(row => row[index][0] !== null));
  let note = selected === "wind" && phase2
    ? "Curiosity’s wind sensor stopped working before phase 2."
    : hasData
      ? "Points are 30-minute means. Empty periods have no readings that pass the selected quality checks."
      : sol.bins.length ? "No readings for this measurement pass the quality checks on the selected sol."
        : "The timeline shows any available daily report. A calibrated 30-minute series is unavailable here.";
  if (campaign) {
    note = selected === "wind"
      ? "Each point is the mean of accepted wind records for that sol. Coverage varies by sol. The wind sensor was unavailable in phase 2."
      : selected === "temperature" ? "Colored marks show the reported daily minimum and maximum. The gap between phases is compressed."
        : "Points show the NASA daily report pressure. The gap between phases is compressed.";
  }

  const chartValues = tracks.flatMap(track => track.values.flat()).filter(value => value !== null);
  const timeScale = campaign ? "for both Bagnold campaign phases" : `by local mean solar time, sol ${sol.sol}`;
  const chartLabel = chartValues.length
    ? `${tracks.map(track => track.name).join(" and ")} ${timeScale}, in ${tracks[0].unit}. The weather downloads include the data.`
    : "No usable observations for this measurement and sol.";
  const phaseBoundary = `${100 * (phaseEnd + 0.5) / lastIndex}%`;

  return (
    <section className="detail-panel" id="weather" aria-labelledby="weather-title">
      <div className="detail-heading">
        <div>
          <h2 id="weather-title">Historical Curiosity weather</h2>
          <p>Explore both Bagnold campaign phases. Within-sol times use Curiosity’s local mean solar time (LMST).</p>
        </div>
        <span className="data-tag">Archived observations</span>
      </div>
      <div className="weather-controls">
        <label htmlFor="weather-sol">Curiosity sol</label>
        <button type="button" aria-label="Previous campaign sol" disabled={sol.index === 0} onClick={() => jump(sol.index - 1)}>‹</button>
        <select id="weather-sol" value={day} onChange={event => onSolChange(Number(event.target.value))}>
          {data.phases.map(([start, end], phase) => (
            <optgroup key={phase} label={GROUPS[phase]}>
              {Array.from({ length: end - start + 1 }, (_, i) => start + i).map(value => (
                <option key={value} value={value}>{`Sol ${value}`}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" aria-label="Next campaign sol" disabled={sol.index === lastIndex} onClick={() => jump(sol.index + 1)}>›</button>
        <div className="weather-metrics" role="group" aria-label="Weather chart measurement">
          {MEASUREMENTS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={selected === key} onClick={() => setSelected(key)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="weather-timeline">
        <label htmlFor="weather-timeline">Campaign sol timeline</label>
        <input
          type="range" id="weather-timeline" min={0} max={lastIndex} value={sol.index}
          aria-valuetext={`Curiosity sol ${day}`} style={{ "--phase-boundary": phaseBoundary }}
          onChange={event => jump(Number(event.target.value))}
        />
        <div className="weather-phase-labels"><span>High Dune and Namib</span><span>Nathan Bridges Dune and Mount Desert Island</span></div>
      </div>
      <p className="section-note" aria-live="polite">{context}</p>
      <dl className="readings weather-readings">
        {summary.map(metric => (
          <div key={metric.name}>
            <dt style={{ "--series": `var(${metric.color})` }}>{metric.name}</dt>
            <dd>{metric.value}</dd>
            <span>{metric.coverage}</span>
          </div>
        ))}
      </dl>
      <div className="weather-view" role="group" aria-label="Weather chart time scale">
        <button type="button" aria-pressed={!campaign} onClick={() => onViewChange("sol")}>Within sol</button>
        <button type="button" aria-pressed={campaign} onClick={() => onViewChange("campaign")}>Campaign overview</button>
      </div>
      <canvas id="weather-chart" ref={chartRef} role="img" aria-label={chartLabel} aria-describedby="weather-chart-note"></canvas>
      <p id="weather-chart-note" className="section-note">{note}</p>
      <details id="weather-details" hidden={!sol.bins.length}>
        <summary>View weather values by local time</summary>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Weather values table">
          <table className="data-table weather-table">
            <caption>Mean and accepted readings per 30-minute window</caption>
            <thead>
              <tr>
                <th scope="col">LMST window</th><th scope="col">Air · °C</th><th scope="col">Ground · °C</th>
                <th scope="col">Pressure · Pa</th><th scope="col">Wind · m/s</th>
              </tr>
            </thead>
            <tbody>
              {sol.bins.map((row, index) => (
                <tr key={index}>
                  <th scope="row">{`${clock(index * data.binMinutes)}–${clock((index + 1) * data.binMinutes)}`}</th>
                  {row.map(([value, count], i) => (
                    <td key={i}>{value === null ? "—" : `${value.toFixed(2)} (${count})`}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="section-note">Wind coverage is sparse. Accepted readings include preliminary archive estimates with favorable sensor flags. <a href="https://doi.org/10.1016/j.icarus.2016.12.016">Bagnold wind study</a></p>
      <div className="data-links">
        <a href={sol.folder + (sol.product || "")}>
          {sol.product ? "NASA PDS label for this sol ↗" : "NASA PDS archive for this sol ↗"}
        </a>
        <a href="/data/rems-weather.csv" download>Download 30-minute data</a>
        <a href="/data/rems-daily.csv" download>Download daily reports</a>
        <a href="https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json">NASA daily report source</a>
        <a href={`${METHODS_URL}#historical-weather`}>Filters and data coverage</a>
      </div>
    </section>
  );
}
