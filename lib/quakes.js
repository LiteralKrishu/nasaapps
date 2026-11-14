/** InSight marsquake catalog helpers: formatting, the distance-band overlay and the timeline chart. */
import catalog from "@/lib/data/marsquakes.json";
import { canvasFont, cssVar, prepareCanvas } from "@/lib/hooks";

export const SIGNAL_NAMES = {
  BROADBAND: "Broadband", LOW_FREQUENCY: "Low frequency", HIGH_FREQUENCY: "High frequency",
  VERY_HIGH_FREQUENCY: "Very high frequency", "2.4_HZ": "2.4 Hz",
};
export const QUALITY_NAMES = { A: "High", B: "Medium", C: "Low", D: "Suspicious" };
export const RADIANS = Math.PI / 180;
export const AREA_WIDTH = 720;
export const AREA_HEIGHT = 360;
export const DEFAULT_EVENT = "S1222a";
export const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

export const available = Boolean(catalog?.events?.length);
export const station = catalog?.insight;
export const gale = catalog?.gale;
export const EVENTS = (catalog?.events ?? []).map(event => ({
  ...event,
  timestamp: Date.parse(event.utc),
  year: event.utc.slice(0, 4),
  location: event.epicenter ? "epicenter" : event.distance ? "distance" : event.bearing !== null ? "bearing" : "none",
}));
export const YEARS = [...new Set(EVENTS.map(event => event.year))];

export const positionStyle = point => ({ left: `${(point.longitude + 180) / 3.6}%`, top: `${(90 - point.latitude) / 1.8}%` });

export function uncertainty(quantity, decimals, unit = "") {
  if (quantity.lower === null && quantity.upper === null) return "";
  if (quantity.lower === quantity.upper) return ` ± ${quantity.lower.toFixed(decimals)}${unit}`;
  const bounds = [];
  if (quantity.lower !== null) bounds.push(`−${quantity.lower.toFixed(decimals)}${unit}`);
  if (quantity.upper !== null) bounds.push(`+${quantity.upper.toFixed(decimals)}${unit}`);
  return ` (${bounds.join(" / ")})`;
}

export function magnitude(event) {
  const value = event.magnitude;
  return value ? `Mw ${value.value.toFixed(1)}${uncertainty(value, 1)}` : "Unreported";
}

export const coordinate = (number, positive, negative) => `${Math.abs(number).toFixed(2)}° ${number < 0 ? negative : positive}`;

export function describeLocation(event) {
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
export function distanceGrid() {
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

export function drawDistance(canvas, event, gridRef) {
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
export function drawTimeline(canvas, width, height, { filtered, selectedIndex, year }) {
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

  ctx.font = canvasFont(11);
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
