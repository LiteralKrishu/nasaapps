/** Return-to-base planner math: pure functions shared by the planner, readiness panel and tests. */

const EPSILON = 1e-8;

export const PACE_FIELDS = [
  { name: "outbound", label: "Outbound pace", unit: "m/s", min: 0.05, max: 5, step: 0.01, value: "0.70" },
  { name: "inbound", label: "Return pace", unit: "m/s", min: 0.05, max: 5, step: 0.01, value: "0.60" },
  { name: "stop", label: "Time at stop", unit: "min", min: 0, max: 1440, step: 0.1, value: "15" },
  { name: "delay", label: "Delay at stop", unit: "min", min: 0, max: 1440, step: 0.1, value: "0" },
];

export const RESOURCES = [
  { name: "oxygen", label: "Oxygen", value: "90", reserve: "20" },
  { name: "co2", label: "CO₂ removal", value: "100", reserve: "20" },
  { name: "battery", label: "Battery", value: "110", reserve: "25" },
  { name: "cooling", label: "Cooling water", value: "85", reserve: "25" },
];

const MINUTE_LIMITS = { min: 0, max: 1440, step: 0.1 };
export const FIELD_RULES = {
  ...Object.fromEntries(PACE_FIELDS.map(field => [field.name, field])),
  ...Object.fromEntries(RESOURCES.flatMap(resource => [[resource.name, MINUTE_LIMITS], [resource.name + "Reserve", MINUTE_LIMITS]])),
};
/** Checks every raw input string; returns per-field validity and whether all are valid. */
export function validate(inputs) {
  const validity = Object.fromEntries(Object.entries(FIELD_RULES).map(([name, rules]) => [name, isValid(String(inputs[name] ?? ""), rules)]));
  return { validity, valid: Object.values(validity).every(Boolean) };
}

/** Parses raw inputs and runs the plan, or returns null when any field is invalid. */
export function planFromInputs(inputs, route) {
  const { valid } = validate(inputs);
  if (!valid) return null;
  return plan(Object.fromEntries(Object.keys(FIELD_RULES).map(name => [name, Number(inputs[name])])), route);
}

export const DEFAULTS = {
  ...Object.fromEntries(PACE_FIELDS.map(field => [field.name, field.value])),
  ...Object.fromEntries(RESOURCES.flatMap(resource => [[resource.name, resource.value], [resource.name + "Reserve", resource.reserve]])),
};

/** Mirrors native number-input validity: required, within min/max, and on the step grid from min. */
export function isValid(raw, { min, max, step }) {
  if (raw.trim() === "") return false;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return false;
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < 1e-7;
}

export function minutes(value) {
  if (Math.abs(value) < EPSILON) return "0.0 min";
  if (Math.abs(value) < 0.05) return value < 0 ? "−<0.1 min" : "<0.1 min";
  return `${value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)} min`;
}

export function plan(values, route) {
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
