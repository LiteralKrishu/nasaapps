// Derives the compact summary the mission-readiness panel needs from the full
// weather, storm and marsquake datasets, so the first page load stays small.
// Run after the Python builders: npm run data:readiness
import { readFileSync, writeFileSync } from "node:fs";

const read = name => JSON.parse(readFileSync(new URL(`../lib/data/${name}.json`, import.meta.url)));
const weather = read("weather");
const storm = read("solar-storm");
const quakes = read("marsquakes");

const round = (value, digits = 1) => (value === null ? null : Number(value.toFixed(digits)));

const sols = weather.sols.map(entry => {
  const [airMin, airMax, groundMin, groundMax, pressure] = entry.daily?.values ?? [null, null, null, null, null];
  const [windSum, windCount] = entry.bins.reduce(([sum, n], row) => [sum + (row[3][0] ?? 0) * row[3][1], n + row[3][1]], [0, 0]);
  const windPeak = entry.bins.reduce((peak, row) => (row[3][0] !== null && row[3][1] > 0 ? Math.max(peak ?? -Infinity, row[3][0]) : peak), null);
  return {
    sol: entry.sol,
    date: entry.daily?.date ?? entry.startUtc.slice(0, 10),
    airMin, airMax, groundMin, groundMax, pressure,
    windMean: windCount ? round(windSum / windCount) : null,
    windPeak: round(windPeak),
  };
});

const magnitudes = quakes.events.filter(event => event.magnitude).map(event => event.magnitude.value);

const summary = {
  weather: { phases: weather.phases, sols },
  radiation: {
    backgroundRate: round(storm.radBackground.value),
    peakRate: round(storm.radPeak.value),
    peakTime: storm.radPeak.time,
  },
  seismic: {
    events: quakes.events.length,
    largestMagnitude: Math.max(...magnitudes),
    insideGale: quakes.gale.inside,
    nearestEpicenterKm: quakes.gale.nearestNonImpact.km,
    nearestImpactKm: quakes.gale.nearest.km,
  },
};

writeFileSync(new URL("../lib/data/readiness.json", import.meta.url), `${JSON.stringify(summary)}\n`);
console.log(`readiness.json: ${sols.length} sols, ${summary.seismic.events} quakes`);
