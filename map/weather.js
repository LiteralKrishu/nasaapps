(() => {
  "use strict";

  const get = id => document.getElementById(id);
  const data = window.curiosityWeather;
  const solSelect = get("weather-sol");
  const context = get("weather-sol-context");
  const chart = get("weather-chart");
  const summary = get("weather-summary");
  const table = get("weather-rows");
  const controls = [...document.querySelectorAll("[data-measurement]")];
  const viewControls = [...document.querySelectorAll("[data-weather-view]")];
  const source = get("weather-source");
  const timeline = get("weather-timeline");
  const previous = get("weather-previous");
  const next = get("weather-next");
  const series = [
    { name: "Air temperature", short: "Air", unit: "°C", color: "--history" },
    { name: "Ground brightness temperature", short: "Ground", unit: "°C", color: "--accent" },
    { name: "Pressure", short: "Pressure", unit: "Pa", color: "--history" },
    { name: "Horizontal wind speed", short: "Wind", unit: "m/s", color: "--history" }
  ];
  const selections = { temperature: [0, 1], pressure: [2], wind: [3] };
  const css = getComputedStyle(document.documentElement);
  const dateFormat = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  let selected = "temperature";
  let view = "sol";
  let sol;

  if (!data?.sols.length) {
    context.textContent = "The local weather archive could not be loaded.";
    chart.hidden = true;
    get("weather-details").hidden = true;
    get("weather-chart-note").hidden = true;
    for (const control of [...controls, ...viewControls]) control.disabled = true;
    return;
  }

  const sols = new Map(data.sols.map((item, index) => [item.sol, { ...item, index }]));
  const groups = ["Phase 1 · High Dune and Namib", "Phase 2 · Nathan Bridges Dune and Mount Desert Island"];
  data.phases.forEach(([start, end], phase) => {
    const group = document.createElement("optgroup");
    group.label = groups[phase];
    for (let day = start; day <= end; day++) group.append(new Option(`Sol ${day}`, day));
    solSelect.append(group);
  });
  timeline.max = data.sols.length - 1;
  const phaseBoundary = data.phases[0][1] - data.phases[0][0] + 0.5;
  timeline.style.setProperty("--phase-boundary", `${100 * phaseBoundary / Number(timeline.max)}%`);
  solSelect.disabled = timeline.disabled = false;
  solSelect.value = sols.has(1225) ? 1225 : data.sols[0].sol;

  function clock(minutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
  }

  function render() {
    const day = Number(solSelect.value);
    sol = sols.get(day);
    const note = get("weather-chart-note");
    const rows = document.createDocumentFragment();
    summary.replaceChildren();
    timeline.value = sol.index;
    timeline.setAttribute("aria-valuetext", `Curiosity sol ${day}`);
    previous.disabled = sol.index === 0;
    next.disabled = sol.index === data.sols.length - 1;
    const date = sol.daily?.date || sol.startUtc;
    const dateLabel = date && !Number.isNaN(Date.parse(date)) ? ` · ${dateFormat.format(new Date(date))}` : "";
    const phase2 = day >= data.phases[1][0];
    const location = phase2 ? "Nathan Bridges Dune and Mount Desert Island" : day < 1181 ? "Approach to High Dune"
      : day <= 1195 ? "High Dune and approach to Namib" : day <= 1215 ? "Namib slip face"
      : day <= 1220 ? "Drive to Gobabeb" : day <= 1244 ? "Gobabeb area" : "Departure from Namib";
    const selectedObservation = Array.isArray(sol.bins) && sol.bins.length > 0;
    const resolution = selectedObservation ? "30-minute data available" : "Daily summary only";
    const hasDailyReport = sol.daily?.values.some(value => value !== null);
    context.textContent = `Sol ${day} · ${location}${dateLabel} · ${selectedObservation || hasDailyReport ? resolution : "No weather observations"}`;
    source.href = sol.folder + (sol.product || "");
    source.textContent = sol.product ? "NASA PDS label for this sol ↗" : "NASA PDS archive for this sol ↗";
    get("weather-details").hidden = !sol.bins.length;

    for (const index of selections[selected]) {
      const metric = series[index];
      const values = sol.bins.map(row => row[index][0]).filter(value => value !== null);
      const samples = sol.bins.reduce((sum, row) => sum + row[index][1], 0);
      const daily = sol.daily?.values ?? [];
      const dailyRange = index < 2 ? daily.slice(index * 2, index * 2 + 2) : index === 2 ? daily.slice(4, 5) : [];
      const hasDaily = dailyRange.length > 0 && dailyRange.every(value => value !== null);
      const cell = document.createElement("div");
      const term = document.createElement("dt");
      const definition = document.createElement("dd");
      const coverage = document.createElement("span");
      term.textContent = metric.name;
      term.style.setProperty("--series", css.getPropertyValue(metric.color));
      definition.textContent = values.length
        ? `${Math.min(...values).toFixed(1)} to ${Math.max(...values).toFixed(1)} ${metric.unit}`
        : hasDaily ? `${dailyRange.join(" to ")} ${metric.unit}` : "No usable readings";
      coverage.textContent = values.length
        ? `Range of window means · ${values.length} of ${sol.bins.length} windows · ${samples.toLocaleString("en")} readings`
        : hasDaily ? `NASA daily report · ${index === 2 ? "reported pressure" : "minimum to maximum"}` : "";
      cell.append(term, definition, coverage);
      summary.append(cell);
    }

    sol.bins.forEach((row, index) => {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = `${clock(index * data.binMinutes)}–${clock((index + 1) * data.binMinutes)}`;
      tr.append(th);
      for (const [value, count] of row) {
        const cell = document.createElement("td");
        cell.textContent = value === null ? "—" : `${value.toFixed(2)} (${count})`;
        tr.append(cell);
      }
      rows.append(tr);
    });
    table.replaceChildren(rows);
    const hasData = selections[selected].some(index => sol.bins.some(row => row[index][0] !== null));
    note.textContent = selected === "wind" && phase2
      ? "Curiosity’s wind sensor stopped working before phase 2."
      : hasData
      ? "Points are 30-minute means. Empty periods have no readings that pass the selected quality checks."
      : sol.bins.length ? "No readings for this measurement pass the quality checks on the selected sol."
      : "The timeline shows any available daily report. A calibrated 30-minute series is unavailable here.";
    if (view === "campaign") {
      note.textContent = selected === "wind"
        ? "Each point is the mean of accepted wind records for that sol. Coverage varies by sol. The wind sensor was unavailable in phase 2."
        : selected === "temperature" ? "Colored marks show the reported daily minimum and maximum. The gap between phases is compressed."
        : "Points show the NASA daily report pressure. The gap between phases is compressed.";
    }
    draw();
  }

  function campaignData() {
    if (selected === "temperature") return selections.temperature.map(index => ({
      ...series[index], values: data.sols.map(entry => entry.daily?.values.slice(index * 2, index * 2 + 2) || [null, null])
    }));
    const values = data.sols.map(entry => {
      if (selected === "pressure") return [entry.daily?.values[4] ?? null];
      const [total, count] = entry.bins.reduce(([sum, n], row) => [sum + row[3][0] * row[3][1], n + row[3][1]], [0, 0]);
      return [count ? total / count : null];
    });
    return [{ ...series[selections[selected][0]], values }];
  }

  function draw() {
    const rect = chart.getBoundingClientRect();
    if (!rect.width) return;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const width = rect.width;
    const height = rect.height;
    chart.width = Math.round(width * scale);
    chart.height = Math.round(height * scale);
    const context2d = chart.getContext("2d");
    if (!context2d) return;
    context2d.scale(scale, scale);
    context2d.font = "11px monospace";
    context2d.fillStyle = css.getPropertyValue("--muted");
    if (!sol) {
      chart.setAttribute("aria-label", "No archive product for this sol.");
      context2d.fillText("No archived observations", 18, 30);
      return;
    }

    const campaign = view === "campaign";
    const tracks = campaign ? campaignData() : selections[selected].map(index => ({
      ...series[index], values: sol.bins.map(row => [row[index][0]])
    }));
    const values = tracks.flatMap(track => track.values.flat()).filter(value => value !== null);
    if (!values.length) {
      chart.setAttribute("aria-label", "No usable observations for this measurement and sol.");
      context2d.fillText("No usable observations", 18, 30);
      return;
    }
    const unit = tracks[0].unit;
    const timeScale = campaign ? "for both Bagnold campaign phases" : `by local mean solar time, sol ${sol.sol}`;
    chart.setAttribute("aria-label", `${tracks.map(track => track.name).join(" and ")} ${timeScale}, in ${unit}. The weather downloads include the data.`);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const roughStep = (max - min) / 4 || 1;
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const step = [1, 2, 5, 10].map(value => value * magnitude).find(value => value >= roughStep);
    const low = Math.floor(min / step) * step;
    const high = Math.max(low + step, Math.ceil(max / step) * step);
    const left = 66;
    const right = width - 18;
    const top = 20;
    const bottom = height - 30;
    const decimalPlaces = Math.max(0, -Math.floor(Math.log10(step) + 1e-8));
    const x = fraction => left + (right - left) * fraction;
    const y = value => bottom - (bottom - top) * (value - low) / (high - low);
    context2d.strokeStyle = css.getPropertyValue("--line");

    for (let tick = 0; tick <= Math.round((high - low) / step); tick++) {
      const value = low + tick * step;
      context2d.beginPath();
      context2d.moveTo(left, y(value));
      context2d.lineTo(right, y(value));
      context2d.stroke();
      context2d.textAlign = "right";
      context2d.fillText(`${value.toFixed(decimalPlaces)} ${unit}`, left - 7, y(value) + 4);
    }
    const phaseEnd = data.phases[0][1] - data.phases[0][0];
    const last = data.sols.length - 1;
    const labelInterval = width < 540 ? 6 : 3;
    const labels = campaign ? [0, phaseEnd, last].map(index => [index / last, `Sol ${data.sols[index].sol}`])
      : Array.from({ length: 24 / labelInterval + 1 }, (_, i) => [i * labelInterval / 24, clock(i * labelInterval * 60)]);
    for (const [position, label] of labels) {
      context2d.textAlign = position === 1 ? "right" : position === 0 ? "left" : "center";
      context2d.fillText(label, x(position), bottom + 18);
    }
    if (campaign) {
      for (const [position, style] of [[(phaseEnd + 0.5) / last, "--muted"], [sol.index / last, "--ink"]]) {
        context2d.strokeStyle = css.getPropertyValue(style);
        context2d.setLineDash([3, 4]);
        context2d.beginPath();
        context2d.moveTo(x(position), top);
        context2d.lineTo(x(position), bottom);
        context2d.stroke();
      }
      context2d.setLineDash([]);
    }
    for (const track of tracks) {
      context2d.strokeStyle = context2d.fillStyle = css.getPropertyValue(track.color);
      context2d.lineWidth = 1.6;
      let previous;
      track.values.forEach(([value, upper], bin) => {
        if (value === null) {
          previous = undefined;
          return;
        }
        const cx = x(campaign ? bin / last : (bin + 0.5) * data.binMinutes / 1440);
        const cy = y(value);
        if (upper !== undefined && upper !== null) {
          context2d.globalAlpha = 0.57;
          const offset = track.short === "Air" ? -1.2 : 1.2;
          context2d.fillRect(cx + offset - 1, y(upper), 2, Math.max(1, cy - y(upper)));
          context2d.globalAlpha = 1;
        } else if (previous && (!campaign || bin !== phaseEnd + 1)) {
          context2d.beginPath();
          context2d.moveTo(...previous);
          context2d.lineTo(cx, cy);
          context2d.stroke();
        }
        if (upper === undefined) {
          context2d.beginPath();
          context2d.arc(cx, cy, campaign ? 1.9 : 2.8, 0, Math.PI * 2);
          context2d.fill();
        }
        previous = [cx, cy];
      });
    }
  }

  solSelect.addEventListener("change", render);
  get("gobabeb-weather").addEventListener("click", () => {
    solSelect.value = 1225;
    if (view === "sol") render();
    else viewControls.find(button => button.dataset.weatherView === "sol").click();
  });
  function jump(index) {
    solSelect.value = data.sols[index].sol;
    render();
  }
  timeline.addEventListener("input", () => jump(Number(timeline.value)));
  previous.addEventListener("click", () => jump(sol.index - 1));
  next.addEventListener("click", () => jump(sol.index + 1));
  for (const control of viewControls) {
    control.addEventListener("click", () => {
      view = control.dataset.weatherView;
      for (const button of viewControls) button.setAttribute("aria-pressed", String(button === control));
      render();
    });
  }
  for (const control of controls) {
    control.addEventListener("click", () => {
      selected = control.dataset.measurement;
      for (const button of controls) button.setAttribute("aria-pressed", String(button === control));
      render();
    });
  }
  new ResizeObserver(draw).observe(chart);
  render();
})();
