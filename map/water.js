(() => {
  "use strict";

  const dataset = window.marsWater;
  if (!dataset?.dan?.length) return;

  const get = id => document.getElementById(id);
  const danLayer = document.querySelector("[data-map-layer=dan]");
  const checkbox = document.querySelector("[data-layer=dan]");
  const selector = get("dan-point");
  const sample = dataset.dan.find(point => point.id === dataset.gobabebSample);
  const active = dataset.dan.filter(point => point.mode === "Active");
  const passive = dataset.dan.filter(point => point.mode === "Passive");
  const number = value => value.toFixed(2);
  const estimate = point => `${number(point.weh)} ± ${number(point.uncertainty)} wt% WEH`;
  const markers = new Map();

  function selectSample(point) {
    danLayer.querySelector(".dan-selected")?.classList.remove("dan-selected");
    const marker = markers.get(point.id);
    marker.classList.add("dan-selected");
    danLayer.append(marker);
    selector.value = point.id;
    const latitude = `${Math.abs(point.lat).toFixed(5)}° ${point.lat < 0 ? "S" : "N"}`;
    get("dan-reading").textContent = `${estimate(point)} · ${point.mode} · ${point.material} · ${latitude}, ${point.lon.toFixed(5)}° E`;
  }

  // Draw active samples above passive samples where the archive uses the same center.
  for (const point of [...passive, ...active]) {
    const attrs = point.mode === "Active"
      ? { cx: point.x, cy: point.y, r: 2 }
      : { x: point.x - 0.85, y: point.y - 0.85, width: 1.7, height: 1.7 };
    const marker = svg(point.mode === "Active" ? "circle" : "rect", {
      ...attrs, class: `dan-marker dan-${point.mode.toLowerCase()}`,
      "vector-effect": "non-scaling-stroke",
    }, danLayer);
    svg("title", {}, marker, `${point.mode} DAN ${point.id} · ${estimate(point)}`);
    marker.addEventListener("click", () => selectSample(point));
    markers.set(point.id, marker);
  }

  selector.add(new Option(`Gobabeb-area sand · Active ${sample.id}`, sample.id));
  for (const group of [active, passive]) {
    const options = document.createElement("optgroup");
    options.label = group[0].mode;
    for (const point of group) {
      if (point.id !== sample.id) options.append(new Option(`${point.id} · ${number(point.weh)} wt% WEH`, point.id));
    }
    selector.append(options);
  }
  selector.addEventListener("change", () => selectSample(dataset.dan.find(point => point.id === selector.value)));
  get("dan-show-on-map").addEventListener("click", () => {
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    get("map").focus({ preventScroll: true });
    get("map").scrollIntoView({ block: "center" });
  });
  get("dan-gobabeb").textContent = estimate(sample);
  get("dan-coverage").textContent = `${active.length} active · ${passive.length} passive`;
  checkbox.disabled = false;
  selectSample(sample);

  const depthButtons = [...document.querySelectorAll("[data-swim-depth]")];
  function selectDepth(button) {
    const depth = button.dataset.swimDepth;
    const layer = dataset.swim[depth];
    for (const item of depthButtons) item.setAttribute("aria-pressed", String(item === button));
    const image = get("swim-image");
    image.src = `data/swim-${depth}.png`;
    image.alt = `Gale Crater regional ice consistency grid, ${button.textContent} depth`;
    const site = get("swim-site");
    site.style.left = `${layer.mapX}%`;
    site.style.top = `${layer.mapY}%`;
    if (layer.score === null) {
      get("swim-reading").textContent = "No data in the Namib cell";
      return;
    }
    const sign = layer.score < 0 ? "−" : layer.score > 0 ? "+" : "";
    const relation = layer.score < layer.threshold ? "below" : "meets";
    get("swim-reading").textContent = `${sign}${number(Math.abs(layer.score))} at Namib · ${relation} the study’s +${number(layer.threshold)} threshold`;
  }
  for (const button of depthButtons) button.addEventListener("click", () => selectDepth(button));
  selectDepth(depthButtons[0]);
  get("water-evidence").hidden = false;
  get("water-unavailable").hidden = true;
})();
