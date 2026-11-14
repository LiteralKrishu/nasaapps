(() => {
  "use strict";

  const get = id => document.getElementById(id);
  const dataset = window.marsStorm;
  if (!dataset?.rows?.length) {
    get("storm-unavailable").hidden = false;
    return;
  }

  const rows = dataset.rows;
  const interval = dataset.windowMinutes * 60_000;
  const start = Date.parse(dataset.start);
  const background = dataset.radBackground.value;
  const eventIndex = (Date.parse(dataset.eventDay) - start) / interval;
  const windowsPerDay = 86_400_000 / interval;
  const slider = get("storm-time");
  const play = get("storm-play");
  const back = get("storm-back");
  const next = get("storm-next");
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const counts = new Intl.NumberFormat("en");
  const css = getComputedStyle(document.documentElement);
  const tracks = [
    { key: "rad", offset: 0, label: "Curiosity RAD absorbed dose rate in micrograys per day",
      unit: "µGy/day", decimals: 1, color: "--accent" },
    { key: "maven", offset: 2, label: "MAVEN SEP 2.24 MeV differential ion flux",
      unit: "ions/(cm²·s·sr·keV)", decimals: 4, color: "--history" },
  ].map(track => {
    const values = rows.map(row => row[track.offset]);
    const max = Math.max(...values.filter(value => value !== null), 0);
    const roughStep = max / 4 || 1;
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const step = [1, 2, 5, 10].map(value => value * magnitude).find(value => value >= roughStep);
    return {
      ...track, values, step, ticks: Math.max(1, Math.ceil(max / step)),
      canvas: get(`storm-${track.key}-chart`),
      reading: get(`storm-${track.key}-value`),
      count: get(`storm-${track.key}-count`),
    };
  });

  let selected = 0;
  let timer = null;

  function timestamp(index) {
    return start + index * interval;
  }

  function windowLabel(index) {
    const from = timestamp(index);
    const to = timestamp(index + 1);
    const day = date.format(from);
    const endDay = date.format(to);
    return `${day}, ${clock.format(from)}–${endDay === day ? "" : endDay + ", "}${clock.format(to)} UTC`;
  }

  function reading(track, value) {
    if (value === null) return "No data";
    const minimum = 10 ** -track.decimals;
    const amount = value > 0 && value < minimum
      ? "<" + minimum.toFixed(track.decimals)
      : value.toLocaleString("en", { maximumFractionDigits: track.decimals });
    return `${amount} ${track.unit}`;
  }

  function draw(track) {
    const { canvas, step, ticks } = track;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.font = "11px monospace";
    const left = 52;
    const right = width - 13;
    const top = 15;
    const bottom = height - 29;
    const x = position => left + (right - left) * position / rows.length;
    const y = value => bottom - (bottom - top) * value / (step * ticks);
    const tickDecimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-8));
    const color = css.getPropertyValue(track.color);
    const grid = css.getPropertyValue("--line");

    function line(x1, y1, x2, y2) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.fillStyle = css.getPropertyValue("--hazard");
    ctx.globalAlpha = 0.12;
    ctx.fillRect(x(eventIndex), top, x(eventIndex + windowsPerDay) - x(eventIndex), bottom - top);
    ctx.globalAlpha = 1;
    ctx.fillStyle = css.getPropertyValue("--muted");
    ctx.strokeStyle = grid;
    ctx.textAlign = "right";
    for (let i = 0; i <= ticks; i++) {
      const value = step * i;
      line(left, y(value), right, y(value));
      ctx.fillText(value.toFixed(tickDecimals), left - 6, y(value) + 4);
    }
    ctx.textAlign = "left";
    for (let index = 0; index < rows.length; index += windowsPerDay) {
      line(x(index), top, x(index), bottom);
      ctx.fillText(date.format(timestamp(index)), x(index) + 3, bottom + 17);
    }

    if (track.key === "rad") {
      ctx.strokeStyle = css.getPropertyValue("--muted");
      ctx.setLineDash([5, 3]);
      line(left, y(background), right, y(background));
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = ctx.fillStyle = color;
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
    ctx.strokeStyle = css.getPropertyValue("--ink");
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

  function select(index, announce = false) {
    selected = Math.max(0, Math.min(rows.length - 1, index));
    slider.value = selected;
    const period = windowLabel(selected);
    slider.setAttribute("aria-valuetext", period);
    get("storm-window").textContent = period;
    back.disabled = selected === 0;
    next.disabled = selected === rows.length - 1;
    for (const track of tracks) {
      const count = rows[selected][track.offset + 1];
      track.reading.textContent = reading(track, track.values[selected]);
      track.count.textContent = count ? `${counts.format(count)} accepted ${count === 1 ? "sample" : "samples"}` : "No accepted samples";
      draw(track);
    }
    if (announce) get("storm-announcement").textContent = `${period}. RAD ${tracks[0].reading.textContent}. MAVEN ${tracks[1].reading.textContent}.`;
  }

  function pause() {
    clearInterval(timer);
    timer = null;
    play.textContent = "Play replay";
  }

  play.addEventListener("click", () => {
    if (timer !== null) {
      pause();
      return;
    }
    if (selected === rows.length - 1) select(0);
    play.textContent = "Pause replay";
    timer = setInterval(() => {
      select(selected + 1);
      if (selected === rows.length - 1) pause();
    }, 180);
  });

  slider.addEventListener("input", () => {
    pause();
    select(Number(slider.value), true);
  });
  slider.addEventListener("pointerdown", pause);
  slider.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
      pause();
    }
  });
  back.addEventListener("click", () => {
    pause();
    select(selected - 1, true);
  });
  next.addEventListener("click", () => {
    pause();
    select(selected + 1, true);
  });
  get("storm-peak").addEventListener("click", () => {
    pause();
    select(dataset.radPeak.window, true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });

  const table = document.createDocumentFragment();
  rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    const time = document.createElement("th");
    time.scope = "row";
    const stamp = timestamp(index);
    time.textContent = `${date.format(stamp)} ${clock.format(stamp)}`;
    tr.append(time);
    for (const track of tracks) {
      const cell = document.createElement("td");
      const value = row[track.offset];
      cell.textContent = value === null ? "—" : `${value} (${counts.format(row[track.offset + 1])})`;
      tr.append(cell);
    }
    table.append(tr);
  });
  get("storm-rows").append(table);
  const radTrack = tracks[0];
  const ratio = dataset.radPeak.value / background;
  get("storm-background").textContent = reading(radTrack, background);
  get("storm-peak-rate").textContent = reading(radTrack, dataset.radPeak.value);
  get("storm-peak-ratio").textContent = `${ratio.toFixed(1)}×`;
  const peakTime = Date.parse(dataset.radPeak.time);
  const peakClock = dataset.radPeak.time.slice(11, 19);
  get("storm-peak-note").textContent = `The peak is a single RAD observation at ${peakClock} UTC on ${date.format(peakTime)}. The background uses ${counts.format(dataset.radBackground.samples)} observations.`;
  slider.max = rows.length - 1;
  get("storm-replay").hidden = false;
  for (const track of tracks) {
    track.canvas.setAttribute("aria-label", `${track.label}, 19–22 May 2024 UTC. Values are available in the replay measurements table.`);
    new ResizeObserver(() => draw(track)).observe(track.canvas);
  }
  select(0);
})();
