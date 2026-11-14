"use strict";

(() => {
  const get = (id) => document.getElementById(`quake-${id}`);
  const catalog = window.MARSQUAKE_CATALOG;
  if (!catalog?.events?.length) {
    get("unavailable").hidden = false;
    return;
  }

  const signalNames = {
    BROADBAND: "Broadband", LOW_FREQUENCY: "Low frequency", HIGH_FREQUENCY: "High frequency",
    VERY_HIGH_FREQUENCY: "Very high frequency", "2.4_HZ": "2.4 Hz",
  };
  const qualityNames = { A: "High", B: "Medium", C: "Low", D: "Suspicious" };
  const events = catalog.events.map((event) => ({
    ...event,
    timestamp: Date.parse(event.utc),
    year: event.utc.slice(0, 4),
    location: event.epicenter ? "epicenter" : event.distance ? "distance" : event.bearing !== null ? "bearing" : "none",
  }));
  const years = [...new Set(events.map((event) => event.year))];
  const yearSelect = get("year");
  const locationSelect = get("location");
  const eventSelect = get("event-select");
  const previous = get("previous");
  const next = get("next");
  const slider = get("time");
  const markers = get("markers");
  const area = get("area");
  const areaContext = area.getContext("2d");
  const chart = get("chart");
  const chartContext = chart.getContext("2d");
  const colors = getComputedStyle(chart);
  const palette = {
    accent: colors.getPropertyValue("--accent").trim(),
    history: colors.getPropertyValue("--history").trim(),
    ink: colors.getPropertyValue("--ink").trim(),
    muted: colors.getPropertyValue("--muted").trim(),
    line: colors.getPropertyValue("--line").trim(),
    bg: colors.getPropertyValue("--bg").trim(),
  };
  const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });
  const radians = Math.PI / 180;
  const station = catalog.insight;
  const gale = catalog.gale;
  let filtered = [];
  let selectedIndex = -1;
  let chartPoints = [];
  let angularDistances;

  function position(node, point) {
    node.style.left = `${(point.longitude + 180) / 3.6}%`;
    node.style.top = `${(90 - point.latitude) / 1.8}%`;
  }

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

  function coordinate(number, positive, negative) {
    return `${Math.abs(number).toFixed(2)}° ${number < 0 ? negative : positive}`;
  }

  function distanceGrid() {
    const { width, height } = area;
    const grid = new Float32Array(width * height);
    const lat = station.latitude * radians;
    const east = Array.from({ length: width }, (_, col) =>
      Math.cos(((col + 0.5) * 360 / width - 180 - station.longitude) * radians));
    for (let row = 0; row < height; row += 1) {
      const angle = (90 - (row + 0.5) * 180 / height) * radians;
      const north = Math.sin(lat) * Math.sin(angle);
      const scale = Math.cos(lat) * Math.cos(angle);
      for (let col = 0; col < width; col += 1) {
        const dot = north + scale * east[col];
        grid[row * width + col] = Math.acos(Math.max(-1, Math.min(1, dot))) / radians;
      }
    }
    return grid;
  }

  function drawDistance(event) {
    const { width, height } = area;
    areaContext.clearRect(0, 0, width, height);
    if (event?.location !== "distance") return;

    const { value, lower, upper } = event.distance;
    const low = Math.max(0, value - (lower ?? 0));
    const high = Math.min(180, value + (upper ?? 0));
    const image = areaContext.createImageData(width, height);
    angularDistances ??= distanceGrid();
    for (let index = 0; index < angularDistances.length; index += 1) {
      const angle = angularDistances[index];
      const edge = Math.min(Math.abs(angle - low), Math.abs(angle - high)) <= 0.55;
      if (edge || (angle >= low && angle <= high)) image.data.set([161, 219, 224, edge ? 230 : 63], index * 4);
    }
    areaContext.putImageData(image, 0, 0);
  }

  function drawTimeline() {
    const width = chart.clientWidth;
    const height = chart.clientHeight;
    if (width === 0 || height === 0) return;
    const density = window.devicePixelRatio || 1;
    chart.width = width * density;
    chart.height = height * density;
    const ctx = chartContext;
    ctx.setTransform(density, 0, 0, density, 0, 0);
    const selectedYear = Number(yearSelect.value);
    const firstYear = selectedYear || Number(years[0]);
    const lastYear = selectedYear || Number(years.at(-1));
    const start = Date.UTC(firstYear, 0, 1);
    const end = Date.UTC(lastYear + 1, 0, 1);
    const left = 54;
    const right = width - 16;
    const top = 19;
    const bottom = height - 75;
    const noMagnitude = bottom + 24;
    const x = (timestamp) => left + (right - left) * (timestamp - start) / (end - start);
    const y = (value) => bottom - (bottom - top) * (value - 0.5) / 4.5;
    const selected = filtered[selectedIndex];

    ctx.font = "11px monospace";
    ctx.fillStyle = palette.muted;
    ctx.strokeStyle = palette.line;
    function horizontal(position, label) {
      ctx.beginPath();
      ctx.moveTo(left, position);
      ctx.lineTo(right, position);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(label, left - 6, position + 4);
    }
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
      for (let year = firstYear; year <= lastYear; year += 1) {
        ctx.fillText(year, x(Date.UTC(year, 0, 1)), height - 22);
      }
    }
    ctx.textAlign = "right";
    ctx.fillText("UTC", right, height - 22);

    chartPoints = filtered.map((event) => ({
      x: x(event.timestamp),
      y: event.magnitude ? y(event.magnitude.value) : noMagnitude,
    }));
    function drawPoint(point, event, active) {
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
    }
    ctx.globalAlpha = 0.38;
    chartPoints.forEach((point, index) => drawPoint(point, filtered[index], false));
    ctx.globalAlpha = 1;
    if (!selected) return;

    const point = chartPoints[selectedIndex];
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
  }

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

  function select(index) {
    selectedIndex = index;
    const event = filtered[index];
    slider.value = index < 0 ? 0 : index;
    slider.disabled = filtered.length < 2;
    slider.setAttribute("aria-valuetext", event ? `${event.id}, ${event.utc.slice(0, 10)} UTC` : "No matching events");
    eventSelect.selectedIndex = index;
    eventSelect.disabled = !event;
    previous.disabled = index <= 0;
    next.disabled = !event || index === filtered.length - 1;
    for (const button of markers.children) {
      button.setAttribute("aria-pressed", String(button.dataset.event === event?.id));
    }

    get("event-title").textContent = event?.id ?? "No matching events";
    get("event-type").textContent = event ? (event.impact ? "Cataloged impact" : signalNames[event.signal]) : "";
    get("date").textContent = event ? `${event.utc.slice(0, 10)} · ${event.utc.slice(11, 19)} UTC` : "";
    get("event-readings").hidden = !event;
    if (event) {
      const point = event.epicenter;
      get("magnitude").textContent = magnitude(event);
      get("quality").textContent = `${event.quality} · ${qualityNames[event.quality]}`;
      get("epicenter").textContent = point
        ? `${coordinate(point.latitude, "N", "S")} · ${coordinate(point.longitude, "E", "W")}`
        : "Unresolved";
      const distance = event.distance;
      const bearing = event.bearing;
      const direction = bearing && `${Number(((bearing.value + 360) % 360).toFixed(1))}°${uncertainty(bearing, 1, "°")} from north`;
      get("distance").textContent = [
        distance ? `${distance.value.toFixed(2)}°${uncertainty(distance, 2, "°")}` : null,
        direction,
      ].filter(Boolean).join(" · ") || "Unreported";
      get("uncertainty").textContent = describeLocation(event);
      get("announcement").textContent = `${event.id}, ${event.utc.slice(0, 10)} UTC. Magnitude ${magnitude(event)}. ${describeLocation(event)}`;
    } else {
      get("uncertainty").textContent = "Choose a different Earth year or type of location evidence.";
      get("announcement").textContent = "No events match these filters.";
    }
    drawDistance(event);
    drawTimeline();
  }

  function filter() {
    const retain = filtered[selectedIndex]?.id ?? "S1222a";
    filtered = events.filter((event) => (!yearSelect.value || event.year === yearSelect.value)
      && (!locationSelect.value || event.location === locationSelect.value));
    const options = document.createDocumentFragment();
    const buttons = document.createDocumentFragment();
    let mapped = 0;
    filtered.forEach((event, index) => {
      const annotation = event.magnitude ? ` · Mw ${event.magnitude.value.toFixed(1)}` : "";
      options.append(new Option(`${event.id} · ${event.utc.slice(0, 10)}${annotation}`, event.id));
      if (!event.epicenter) return;
      mapped += 1;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `quake-marker${event.impact ? " is-impact" : ""}`;
      button.dataset.event = event.id;
      const label = `${event.id} · ${magnitude(event)}${event.impact ? " · impact" : ""}`;
      button.title = label;
      button.setAttribute("aria-label", label);
      position(button, event.epicenter);
      button.addEventListener("click", () => select(index));
      buttons.append(button);
    });
    eventSelect.replaceChildren(options);
    markers.replaceChildren(buttons);
    slider.max = Math.max(0, filtered.length - 1);
    const eventLabel = filtered.length === 1 ? "event" : "events";
    get("count").textContent = `${filtered.length.toLocaleString("en")} ${eventLabel} · ${mapped} mapped`;
    select(filtered.length ? Math.max(0, filtered.findIndex((event) => event.id === retain)) : -1);
  }

  position(get("insight"), station);
  position(get("gale"), gale);
  const km = value => value.toLocaleString("en");
  get("gale-summary").textContent = `InSight was about ${km(gale.stationKm)} km from Gale’s center. This map shows ${gale.inside} cataloged sources within Gale’s approximate rim. The nearest plotted impact (${gale.nearest.id}) was about ${km(gale.nearest.km)} km from the crater center. The nearest plotted seismic epicenter (${gale.nearestNonImpact.id}) was about ${km(gale.nearestNonImpact.km)} km away.`;
  yearSelect.append(...years.map((year) => new Option(year, year)));
  yearSelect.addEventListener("change", filter);
  locationSelect.addEventListener("change", filter);
  eventSelect.addEventListener("change", () => select(eventSelect.selectedIndex));
  slider.addEventListener("input", () => select(Number(slider.value)));
  previous.addEventListener("click", () => select(selectedIndex - 1));
  next.addEventListener("click", () => select(selectedIndex + 1));
  chart.addEventListener("click", (event) => {
    const bounds = chart.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    let closest = -1;
    let limit = 14 ** 2;
    chartPoints.forEach((point, index) => {
      const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
      if (distance < limit) {
        closest = index;
        limit = distance;
      }
    });
    if (closest >= 0) select(closest);
  });
  get("explorer").hidden = false;
  filter();
  new ResizeObserver(drawTimeline).observe(chart);
})();
