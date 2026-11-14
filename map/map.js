"use strict";

const survey = window.marsSurvey;
const map = document.querySelector("#map");
const chart = document.querySelector("#profile-chart");
const slider = document.querySelector("#profile-position");
const routeButtons = [...document.querySelectorAll("[data-route]")];
const [width, height] = survey.size;
const view = { x: 0, y: 0, zoom: 1 };
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const color = {
  accent: css("--accent"), direct: css("--direct"), hazard: css("--hazard"),
  history: css("--history"), ink: css("--ink"), muted: css("--muted"),
  line: css("--line"), bg: css("--bg")
};
const svgNS = "http://www.w3.org/2000/svg";
const shapes = {};
let routeName = "detour";
let activePoint;
let mapCursor;
let drag;

function svg(tag, attributes, parent, text) {
  const element = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  parent.append(element);
  return element;
}

function linePath(points) {
  return points.map((point, index) => `${index ? "L" : "M"}${point[0]},${point[1]}`).join(" ");
}

function layer(name, attributes = {}) {
  shapes[name] = svg("g", { ...attributes, "data-map-layer": name }, map);
  return shapes[name];
}

function drawMap() {
  const pattern = svg("pattern", {
    id: "hazard-lines", width: 5, height: 5, patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)"
  }, svg("defs", {}, map));
  svg("path", { d: "M0 0V5", stroke: color.hazard, "stroke-width": 1.25, opacity: 0.65 }, pattern);

  svg("image", { href: "data/imagery.webp", width, height }, layer("imagery"));
  svg("image", { href: "data/slope.png", width, height, opacity: 0.88 }, layer("slope", { display: "none" }));
  const contours = layer("contours", { fill: "none", stroke: color.ink, opacity: 0.43 });
  for (const contour of survey.contours) {
    svg("path", { d: contour.path, "stroke-width": contour.major ? 1.05 : 0.48,
      "vector-effect": "non-scaling-stroke" }, contours);
  }
  const hazard = layer("hazard");
  svg("path", { d: linePath(survey.hazard) + "Z", fill: color.hazard, "fill-opacity": 0.14,
    stroke: color.hazard, "stroke-width": 1.35, "vector-effect": "non-scaling-stroke" }, hazard);
  svg("path", { d: linePath(survey.hazard) + "Z", fill: "url(#hazard-lines)" }, hazard);
  label(hazard, ...survey.duneLabel, "Namib Dune", color.ink, "middle");

  const track = layer("history");
  svg("path", { d: linePath(survey.history), fill: "none", stroke: color.history, "stroke-width": 1.7,
    "stroke-dasharray": "2 3", "vector-effect": "non-scaling-stroke" }, track);

  layer("dan", { display: "none" });
  const routes = layer("routes", { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" });
  for (const name of ["direct", "detour"]) {
    const route = survey.routes[name];
    const group = svg("g", {}, routes);
    const d = linePath(route.path);
    svg("path", { d, stroke: color.bg, "stroke-width": 5.2, "vector-effect": "non-scaling-stroke" }, group);
    svg("path", { d, stroke: name === "direct" ? color.direct : color.accent, "stroke-width": name === "direct" ? 2 : 3,
      "stroke-dasharray": name === "direct" ? "5 5" : "none", "vector-effect": "non-scaling-stroke" }, group);
    shapes[name] = group;
  }

  const stops = layer("stops");
  for (const stop of survey.stops) {
    svg("circle", { cx: stop.x, cy: stop.y, r: 2.1, fill: color.bg,
      stroke: color.accent, "stroke-width": 2, "vector-effect": "non-scaling-stroke" }, stops);
    label(stops, stop.x + stop.dx, stop.y + stop.dy, stop.label, color.ink, stop.anchor);
  }
  mapCursor = svg("circle", { r: 2.55, fill: color.ink, stroke: color.bg, "stroke-width": 2,
    "vector-effect": "non-scaling-stroke", "pointer-events": "none" }, stops);
  placeView();
}

function label(parent, x, y, value, fill, anchor = "start") {
  return svg("text", { x, y, fill, "text-anchor": anchor, "font-size": 4.7, "font-family": "monospace",
    class: "map-label", "font-weight": 700, "paint-order": "stroke", stroke: color.bg, "stroke-width": 1.3,
    "stroke-linejoin": "round" }, parent, value);
}

const axes = { left: 64, right: 782, top: 15, bottom: 128 };
let chartWidth = 800;

function drawChart() {
  chart.replaceChildren();
  chartWidth = Math.max(250, Math.round(chart.getBoundingClientRect().width));
  axes.right = chartWidth - 18;
  chart.setAttribute("viewBox", `0 0 ${chartWidth} 155`);
  const { left, right, top, bottom } = axes;
  const route = survey.routes[routeName];
  const samples = route.profile;
  const routeColor = routeName === "detour" ? color.accent : color.direct;
  const elevations = Object.values(survey.routes).flatMap(option => option.profile.map(sample => sample[3]));
  const min = Math.floor((Math.min(...elevations) - 0.25) / 2) * 2;
  const max = Math.ceil((Math.max(...elevations) + 0.25) / 2) * 2;
  const xAt = distance => left + distance / route.distance * (right - left);
  const yAt = elevation => bottom - (elevation - min) / (max - min) * (bottom - top);
  const path = linePath(samples.map(sample => [xAt(sample[0]), yAt(sample[3])]));
  for (let i = 0; i <= 3; i++) {
    const elevation = max - (max - min) * i / 3;
    const y = yAt(elevation);
    svg("path", { d: `M${left} ${y}H${right}`, stroke: color.line }, chart);
    svg("text", { x: left - 8, y: y + 4, fill: color.muted, "text-anchor": "end", "font-size": 12 }, chart, `${Math.round(elevation)} m`);
  }
  svg("path", { d: `${path}L${right} ${bottom}H${left}Z`, fill: routeColor, opacity: 0.14 }, chart);
  svg("path", { d: path, stroke: routeColor, "stroke-width": 2.4, fill: "none" }, chart);
  for (let i = 0; i <= 4; i++) {
    const x = left + (right - left) * i / 4;
    svg("text", { x, y: 148, fill: color.muted, "text-anchor": i === 4 ? "end" : "middle", "font-size": 12 },
      chart, `${Math.round(route.distance * i / 4)} m`);
  }
  const chartCursor = svg("g", {}, chart);
  const guide = svg("line", { y1: top, y2: bottom, stroke: color.direct, "stroke-dasharray": "3 4" }, chartCursor);
  const dot = svg("circle", { r: 4, fill: routeColor, stroke: color.bg, "stroke-width": 1.7 }, chartCursor);

  return index => {
    const point = samples[index];
    const x = xAt(point[0]);
    guide.setAttribute("x1", x);
    guide.setAttribute("x2", x);
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", yAt(point[3]));
  };
}

function inspect(index) {
  const point = survey.routes[routeName].profile[index];
  activePoint(index);
  slider.value = index;
  slider.setAttribute("aria-valuetext", `${Math.round(point[0])} meters along route, elevation ${point[3]} meters`);
  mapCursor.setAttribute("cx", point[1]);
  mapCursor.setAttribute("cy", point[2]);
  document.querySelector("#profile-readout").textContent = `${point[0].toFixed(1)} m · ${point[3].toFixed(1)} m`;
}

function selectRoute(name) {
  routeName = name;
  const route = survey.routes[name];
  routeButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.route === name)));
  shapes.direct.setAttribute("opacity", name === "direct" ? 1 : 0.69);
  shapes.detour.setAttribute("opacity", name === "detour" ? 1 : 0.36);
  document.querySelector("#distance").textContent = `${Math.round(route.distance)} m`;
  document.querySelector("#ascent").textContent = `${route.ascent.toFixed(1)} m`;
  document.querySelector("#grade").textContent = `${route.peakGrade.toFixed(1)}°`;
  document.querySelector("#route-note").textContent = name === "detour"
    ? `Skirts the mapped dune with at least ${Math.floor(route.clearance)} m clearance. Metrics cover the outbound leg.`
    : `Crosses ${Math.round(route.hazardDistance)} m of the dune exclusion zone. Shown for comparison.`;
  slider.max = route.profile.length - 1;
  activePoint = drawChart();
  inspect(0);
  document.dispatchEvent(new CustomEvent("marswalk:route", {
    detail: { name, distance: route.distance, hazardDistance: route.hazardDistance }
  }));
}

function placeView() {
  const w = width / view.zoom;
  const h = height / view.zoom;
  view.x = Math.min(Math.max(0, view.x), width - w);
  view.y = Math.min(Math.max(0, view.y), height - h);
  map.setAttribute("viewBox", `${view.x} ${view.y} ${w} ${h}`);
  map.classList.toggle("can-pan", view.zoom > 1);
  document.querySelector("#zoom-in").disabled = view.zoom >= 4;
  document.querySelector("#zoom-out").disabled = view.zoom <= 1;
  document.querySelector("#scale span").style.width = `${25 * map.getBoundingClientRect().width / (w * survey.eastScale)}px`;
}

function zoom(factor) {
  const centerX = view.x + width / (2 * view.zoom);
  const centerY = view.y + height / (2 * view.zoom);
  view.zoom = Math.min(4, Math.max(1, view.zoom * factor));
  view.x = centerX - width / (2 * view.zoom);
  view.y = centerY - height / (2 * view.zoom);
  placeView();
}

drawMap();
selectRoute(routeName);

for (const input of document.querySelectorAll("[data-layer]")) {
  input.addEventListener("change", () => {
    shapes[input.dataset.layer].setAttribute("display", input.checked ? "inline" : "none");
    if (input.dataset.layer === "slope") document.querySelector("#slope-legend").hidden = !input.checked;
  });
}

for (const button of routeButtons) button.addEventListener("click", () => selectRoute(button.dataset.route));
slider.addEventListener("input", () => inspect(Number(slider.value)));
chart.addEventListener("pointermove", event => {
  const bounds = chart.getBoundingClientRect();
  const chartX = (event.clientX - bounds.left) / bounds.width * chartWidth;
  const fraction = Math.min(1, Math.max(0, (chartX - axes.left) / (axes.right - axes.left)));
  inspect(Math.round(fraction * Number(slider.max)));
});

document.querySelector("#zoom-in").addEventListener("click", () => zoom(1.45));
document.querySelector("#zoom-out").addEventListener("click", () => zoom(1 / 1.45));
document.querySelector("#reset").addEventListener("click", () => {
  Object.assign(view, { x: 0, y: 0, zoom: 1 });
  placeView();
});
new ResizeObserver(placeView).observe(map);
new ResizeObserver(() => {
  const nextWidth = Math.max(250, Math.round(chart.getBoundingClientRect().width));
  if (nextWidth !== chartWidth) {
    activePoint = drawChart();
    inspect(Number(slider.value));
  }
}).observe(chart);

map.addEventListener("keydown", event => {
  const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  if (!direction || view.zoom === 1) return;
  event.preventDefault();
  view.x += direction[0] * width / (8 * view.zoom);
  view.y += direction[1] * height / (8 * view.zoom);
  placeView();
});

map.addEventListener("pointerdown", event => {
  if (event.button !== 0 || view.zoom === 1 || event.target.closest(".dan-marker")) return;
  drag = { screenX: event.clientX, screenY: event.clientY, x: view.x, y: view.y };
  map.setPointerCapture(event.pointerId);
  map.classList.add("is-panning");
});

map.addEventListener("pointermove", event => {
  const scale = width / (map.getBoundingClientRect().width * view.zoom);
  if (drag) {
    view.x = drag.x - (event.clientX - drag.screenX) * scale;
    view.y = drag.y - (event.clientY - drag.screenY) * scale;
    placeView();
  }
  const bounds = map.getBoundingClientRect();
  const lon = (survey.origin[0] + view.x + (event.clientX - bounds.left) * scale) / survey.metresPerDegree;
  const lat = (survey.origin[1] - view.y - (event.clientY - bounds.top) * scale) / survey.metresPerDegree;
  document.querySelector("#map-readout").textContent = `${Math.abs(lat).toFixed(5)}° ${lat < 0 ? "S" : "N"} · ${lon.toFixed(5)}° E`;
});

map.addEventListener("lostpointercapture", () => {
  drag = undefined;
  map.classList.remove("is-panning");
});
