(() => {
  "use strict";

  const get = id => document.getElementById(id);
  const data = window.marsResources;
  if (!data?.layers?.length || !data?.sites?.length) {
    get("swim-unavailable").hidden = false;
    return;
  }

  const image = get("swim-map");
  const source = get("swim-source");
  const siteSelect = get("swim-resource-site");
  const markerList = get("swim-markers");
  const depthControls = get("swim-depths");
  const buttons = new Map();
  const markers = new Map();
  let layer = data.layers[0];

  function addCell(row, tag, content, scope) {
    const cell = document.createElement(tag);
    cell.textContent = content;
    if (scope) cell.scope = scope;
    row.append(cell);
    return cell;
  }

  function status(score, depth) {
    if (score === null) return "No mapped value";
    return score >= depth.threshold ? "Meets study threshold" : "Below study threshold";
  }

  function selectSite(key) {
    const site = data.sites.find(item => item.key === key);
    siteSelect.value = key;
    for (const [id, marker] of markers) marker.setAttribute("aria-pressed", String(key === id));
    const lat = Math.abs(site.latitude).toFixed(2) + (site.latitude < 0 ? "° S" : "° N");
    get("swim-coordinates").textContent = `${lat} · ${site.longitude.toFixed(2)}° E`;
    const score = site.scores[layer.key];
    get("swim-score").textContent = score === null ? "No mapped value" : `Cᵢ ${score.toFixed(3)}`;
    get("swim-result").textContent = score === null
      ? `${site.name} · ${layer.depth}`
      : `${site.name} · ${layer.depth} · ${status(score, layer)} (${layer.threshold.toFixed(2)})`;
    for (const row of get("swim-table-body").rows) row.classList.toggle("swim-selected-row", row.dataset.site === key);
  }

  function selectLayer(next) {
    layer = next;
    for (const [key, button] of buttons) button.setAttribute("aria-pressed", String(key === layer.key));
    get("swim-image-error").hidden = true;
    image.src = `data/${layer.image}`;
    image.alt = `SWIM ice evidence at ${layer.depth}, from 60° S to 60° N. Blue areas meet the study threshold.`;
    get("swim-threshold").textContent = `Meets threshold (${layer.threshold.toFixed(2)}–1.00)`;
    source.href = layer.source;
    selectSite(siteSelect.value);
  }

  const header = document.createElement("tr");
  addCell(header, "th", "Location", "col");
  for (const depth of data.layers) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = depth.depth;
    button.addEventListener("click", () => selectLayer(depth));
    buttons.set(depth.key, button);
    depthControls.append(button);
    addCell(header, "th", depth.depth, "col");
  }
  get("swim-table-head").append(header);

  const table = get("swim-table-body");
  for (const site of data.sites) {
    siteSelect.add(new Option(site.name, site.key));
    const marker = document.createElement("button");
    marker.type = "button";
    marker.title = site.name;
    marker.setAttribute("aria-label", site.name);
    const longitude = (site.longitude + 180) % 360 - 180;
    marker.style.left = `${(longitude + 180) / 360 * 100}%`;
    marker.style.top = `${(60 - site.latitude) / 120 * 100}%`;
    marker.addEventListener("click", () => selectSite(site.key));
    markerList.append(marker);
    markers.set(site.key, marker);

    const row = document.createElement("tr");
    row.dataset.site = site.key;
    addCell(row, "th", site.name, "row");
    for (const depth of data.layers) {
      const score = site.scores[depth.key];
      addCell(row, "td", score === null ? "No mapped value" : `${score.toFixed(3)} · ${status(score, depth)}`);
    }
    table.append(row);
  }

  image.addEventListener("error", () => { get("swim-image-error").hidden = false; });
  siteSelect.addEventListener("change", () => selectSite(siteSelect.value));
  selectLayer(layer);
  get("swim-explorer").hidden = false;
})();
