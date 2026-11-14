"use client";

import { useState } from "react";
import survey from "@/lib/data/survey.json";

const EPSILON = 1e-8;

const PACE_FIELDS = [
  { name: "outbound", label: "Outbound pace", unit: "m/s", min: 0.05, max: 5, step: 0.01, value: "0.70" },
  { name: "inbound", label: "Return pace", unit: "m/s", min: 0.05, max: 5, step: 0.01, value: "0.60" },
  { name: "stop", label: "Time at stop", unit: "min", min: 0, max: 1440, step: 0.1, value: "15" },
  { name: "delay", label: "Delay at stop", unit: "min", min: 0, max: 1440, step: 0.1, value: "0" },
];

const RESOURCES = [
  { name: "oxygen", label: "Oxygen", value: "90", reserve: "20" },
  { name: "co2", label: "CO₂ removal", value: "100", reserve: "20" },
  { name: "battery", label: "Battery", value: "110", reserve: "25" },
  { name: "cooling", label: "Cooling water", value: "85", reserve: "25" },
];

const MINUTE_LIMITS = { min: 0, max: 1440, step: 0.1 };
const FIELD_RULES = {
  ...Object.fromEntries(PACE_FIELDS.map(field => [field.name, field])),
  ...Object.fromEntries(RESOURCES.flatMap(resource => [[resource.name, MINUTE_LIMITS], [resource.name + "Reserve", MINUTE_LIMITS]])),
};
const DEFAULTS = {
  ...Object.fromEntries(PACE_FIELDS.map(field => [field.name, field.value])),
  ...Object.fromEntries(RESOURCES.flatMap(resource => [[resource.name, resource.value], [resource.name + "Reserve", resource.reserve]])),
};

/** Mirrors native number-input validity: required, within min/max, and on the step grid from min. */
function isValid(raw, { min, max, step }) {
  if (raw.trim() === "") return false;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return false;
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < 1e-7;
}

function minutes(value) {
  if (Math.abs(value) < EPSILON) return "0.0 min";
  if (Math.abs(value) < 0.05) return value < 0 ? "−<0.1 min" : "<0.1 min";
  return `${value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)} min`;
}

function plan(values, route) {
  const outbound = route.distance / values.outbound / 60;
  const inbound = route.distance / values.inbound / 60;
  const phases = [
    { label: "Outbound", key: "outbound", duration: outbound },
    { label: "Science stop", key: "stop", duration: values.stop },
    { label: "Delay", key: "delay", duration: values.delay },
    { label: "Return", key: "inbound", duration: inbound },
  ];
  const elapsed = phases.reduce((sum, phase) => sum + phase.duration, 0);
  const budgets = RESOURCES.map(resource => ({
    ...resource,
    available: values[resource.name],
    reserve: values[resource.name + "Reserve"],
    usable: values[resource.name] - values[resource.name + "Reserve"],
  }));
  const limit = Math.min(...budgets.map(budget => budget.usable));
  const limitLabel = budgets.filter(budget => Math.abs(budget.usable - limit) < EPSILON).map(budget => budget.label).join(", ");
  const margin = limit - elapsed;
  const latestDeparture = limit - inbound;
  const belowReserve = margin < -EPSILON;
  const atReserve = Math.abs(margin) < EPSILON;
  const crossesDune = route.hazardDistance > 0;
  const belowAtDeparture = budgets.filter(budget => budget.usable < -EPSILON);
  const budgetStatus = belowAtDeparture.length
    ? `Below reserve at departure: ${belowAtDeparture.map(budget => budget.label).join(", ")}.`
    : belowReserve
      ? "One or more resources would fall below reserve before arrival."
      : atReserve ? "The limiting resource reaches reserve at arrival." : "All modeled resources are above reserve at arrival.";
  const terrainStatus = crossesDune ? " The selected route crosses the dune exclusion zone. Budget comparison only." : "";

  const balances = Object.fromEntries(budgets.map(budget => {
    const remaining = budget.available - elapsed;
    return [budget.name, {
      text: remaining < -EPSILON ? `Depleted (${minutes(-remaining)} short)` : minutes(remaining),
      result: remaining + EPSILON < budget.reserve ? "warning" : "ok",
    }];
  }));

  // Timeline segments and the phase in which the first reserve is reached.
  const total = Math.max(elapsed, limit);
  let start = 0;
  let reservePhase;
  const segments = [];
  for (const phase of phases) {
    if (phase.duration === 0) continue;
    const end = start + phase.duration;
    if (limit > start && limit <= end + EPSILON) reservePhase = phase.label;
    segments.push({ ...phase, start, end, width: `${100 * phase.duration / total}%` });
    start = end;
  }
  const reserveTime = limit < 0 ? "" : `First reserve at ${minutes(limit)} from start (${limitLabel}).`;
  let reserveStage = "";
  if (limit > elapsed + EPSILON) reserveStage = "That is after the planned return.";
  else if (Math.abs(limit - elapsed) <= EPSILON) reserveStage = "That is at arrival back at base.";
  else if (limit === 0) reserveStage = "That is at departure.";
  else if (reservePhase) reserveStage = `That is during the ${reservePhase.toLowerCase()} phase.`;
  const departureTime = latestDeparture >= outbound - EPSILON
    ? `Up to ${minutes(Math.max(0, latestDeparture - outbound))} at the stop, including any delay.`
    : "The out-and-back walk alone reaches or exceeds the return budget.";

  return {
    elapsed, margin, limitLabel, balances, segments,
    latestDeparture: latestDeparture + EPSILON < outbound ? "Return exceeds budget" : `${minutes(latestDeparture)} from start`,
    result: crossesDune || belowReserve || atReserve ? "warning" : "ok",
    status: budgetStatus + terrainStatus,
    markerHidden: limit < 0,
    markerLeft: `${100 * Math.max(0, limit) / total}%`,
    reserveNote: [reserveTime, reserveStage, departureTime].filter(Boolean).join(" "),
  };
}

export default function ReturnPlanner({ routeName }) {
  const [inputs, setInputs] = useState(DEFAULTS);
  const route = survey.routes[routeName];
  const validity = Object.fromEntries(Object.entries(inputs).map(([name, raw]) => [name, isValid(raw, FIELD_RULES[name])]));
  const valid = Object.values(validity).every(Boolean);
  const result = valid
    ? plan(Object.fromEntries(Object.entries(inputs).map(([name, raw]) => [name, Number(raw)])), route)
    : null;

  const field = name => ({
    name,
    type: "number",
    ...FIELD_RULES[name],
    value: inputs[name],
    required: true,
    "aria-invalid": String(!validity[name]),
    onChange: event => setInputs(current => ({ ...current, [name]: event.target.value })),
  });

  return (
    <section className="detail-panel" id="return" aria-labelledby="return-title">
      <div className="detail-heading">
        <div>
          <h2 id="return-title">Return to base</h2>
          <p>Plan the round trip on the selected traverse and see how much time you have for science and delays.</p>
        </div>
        <span className="data-tag">
          {`${routeName === "direct" ? "Direct comparison" : "Namib detour"} · ${(route.distance * 2).toFixed(1)} m`}
        </span>
      </div>
      <form
        onSubmit={event => event.preventDefault()}
        onReset={event => { event.preventDefault(); setInputs(DEFAULTS); }}
      >
        <div className="pace-fields">
          {PACE_FIELDS.map(({ name, label, unit }) => (
            <label key={name}>{label} <span>{unit}</span><input {...field(name)} /></label>
          ))}
        </div>
        <table className="data-table budget-table">
          <caption>Suit endurance and reserve in Earth minutes</caption>
          <thead>
            <tr>
              <th scope="col">Resource</th>
              <th scope="col" id="available-col">At departure</th>
              <th scope="col" id="reserve-col">Minimum reserve</th>
              <th scope="col">At return</th>
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map(({ name, label }) => (
              <tr key={name}>
                <th scope="row" id={`${name}-label`}>{label}</th>
                <td><input {...field(name)} aria-labelledby={`${name}-label available-col`} /></td>
                <td><input {...field(name + "Reserve")} aria-labelledby={`${name}-label reserve-col`} /></td>
                <td data-result={result?.balances[name].result}>{result ? result.balances[name].text : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="form-actions">
          <p className="form-error" aria-live="polite">
            {valid ? "" : "Enter valid values in the marked fields to calculate the return budget."}
          </p>
          <button type="reset">Reset inputs</button>
        </div>
      </form>
      <div className="planner-result" data-result={result ? result.result : "pending"}>
        <dl className="readings">
          <div><dt>Round trip</dt><dd>{result ? minutes(result.elapsed) : "—"}</dd></div>
          <div><dt>Time margin</dt><dd>{result ? minutes(result.margin) : "—"}</dd></div>
          <div><dt>Limiting resource</dt><dd>{result ? result.limitLabel : "—"}</dd></div>
          <div><dt>Latest departure from stop</dt><dd>{result ? result.latestDeparture : "—"}</dd></div>
        </dl>
        <p id="return-status" role="status">{result?.status ?? ""}</p>
      </div>
      <section id="return-timeline" className="return-timeline" aria-labelledby="return-timeline-title" hidden={!result}>
        <h3 id="return-timeline-title">Trip timeline</h3>
        <p className="section-note">{result?.reserveNote}</p>
        <div className="return-track" aria-hidden="true">
          <div id="return-track-phases">
            {result?.segments.map(segment => <span key={segment.key} data-phase={segment.key} style={{ width: segment.width }} />)}
          </div>
          <i id="return-reserve-marker" hidden={!result || result.markerHidden} style={{ left: result?.markerLeft }} />
        </div>
        <dl id="return-phases" className="readings">
          {result?.segments.map(segment => (
            <div key={segment.key} data-phase={segment.key}>
              <dt>{segment.label}</dt>
              <dd>{minutes(segment.duration)}</dd>
              <span>{`${minutes(segment.start).replace(" min", "")}–${minutes(segment.end)} from start`}</span>
            </div>
          ))}
        </dl>
      </section>
      <p className="section-note">The simulation uses the same path both ways and assumes constant resource use. Enter average walking paces and suit endurance for the planned workload. Delays are modeled at the stop before return. The starting values are illustrative.</p>
    </section>
  );
}
