/**
 * Mission readiness: combines the route, suit budget, weather, radiation and
 * seismic context into one go / caution / no-go call.
 * Thresholds are illustrative planning limits for this demo, not NASA flight rules.
 */
import { minutes } from "@/lib/planner";

export const THRESHOLDS = {
  slopeCaution: 15, // degrees
  slopeNoGo: 20,
  marginCaution: 15, // minutes of consumables left above reserve at return
  coldCaution: -85, // °C overnight air minimum
  windCaution: 10, // m/s, 30-minute mean
};

export const LEVELS = { go: 0, caution: 1, nogo: 2, incomplete: 3 };
export const LEVEL_LABELS = { go: "Go", caution: "Caution", nogo: "No-go", incomplete: "Incomplete" };

const celsius = value => `${value < 0 ? "−" : ""}${Math.abs(value)} °C`;
const worst = statuses => statuses.reduce((current, status) => (LEVELS[status] > LEVELS[current] ? status : current), "go");

export function assessTerrain(route) {
  const facts = `${Math.round(route.distance)} m each way · peak slope ${route.peakGrade.toFixed(1)}°`;
  if (route.hazardDistance > 0) {
    return { status: "nogo", summary: `Crosses ${Math.round(route.hazardDistance)} m of the dune exclusion zone.`, facts };
  }
  if (route.peakGrade >= THRESHOLDS.slopeNoGo) {
    return { status: "nogo", summary: `Slope exceeds ${THRESHOLDS.slopeNoGo}° on foot.`, facts };
  }
  if (route.peakGrade >= THRESHOLDS.slopeCaution) {
    return { status: "caution", summary: `Slopes above ${THRESHOLDS.slopeCaution}°; walk carefully.`, facts };
  }
  return { status: "go", summary: `Stays clear of the dune and below ${THRESHOLDS.slopeCaution}°.`, facts };
}

export function assessConsumables(result) {
  if (!result) return { status: "incomplete", summary: "Fix the return-planner inputs to assess the suit budget.", facts: "" };
  const facts = `Round trip ${minutes(result.elapsed)} · limiting: ${result.limitLabel}`;
  if (result.margin < 0 || result.markerHidden) {
    return { status: "nogo", summary: `Falls ${minutes(-result.margin)} short of reserve.`, facts };
  }
  if (result.margin < THRESHOLDS.marginCaution) {
    return { status: "caution", summary: `Only ${minutes(result.margin)} of margin above reserve.`, facts };
  }
  return { status: "go", summary: `${minutes(result.margin)} of margin above reserve at return.`, facts };
}

export function assessWeather(day) {
  if (!day || day.airMin === null) {
    return { status: "caution", summary: "No Curiosity weather report for this sol.", facts: day ? `Sol ${day.sol}` : "" };
  }
  const wind = day.windPeak === null ? "wind not recorded" : `wind up to ${day.windPeak} m/s`;
  const facts = `Sol ${day.sol} · air ${celsius(day.airMin)} to ${celsius(day.airMax)} · ${wind}`;
  const issues = [];
  if (day.airMin <= THRESHOLDS.coldCaution) issues.push(`a ${celsius(day.airMin)} night: return well before dusk`);
  if (day.windPeak !== null && day.windPeak >= THRESHOLDS.windCaution) issues.push(`winds of ${day.windPeak} m/s may lift sand`);
  if (issues.length) return { status: "caution", summary: `Expect ${issues.join("; ")}.`, facts };
  return { status: "go", summary: "Within modeled temperature and wind limits.", facts };
}

export function assessRadiation(radiation, elapsedMinutes, stormActive) {
  const rate = stormActive ? radiation.peakRate : radiation.backgroundRate;
  const dose = elapsedMinutes === null ? null : rate * elapsedMinutes / 1440;
  const doseText = dose === null ? "" : ` · ≈${dose < 10 ? dose.toFixed(1) : Math.round(dose)} µGy this EVA`;
  if (stormActive) {
    const factor = Math.round(radiation.peakRate / radiation.backgroundRate);
    return {
      status: "caution",
      summary: `Solar particle event: surface dose ${factor}× background. Keep the EVA short and near shelter.`,
      facts: `${Math.round(rate).toLocaleString("en")} µGy/day (May 2024 peak)${doseText}`,
    };
  }
  return { status: "go", summary: "Quiet space weather at Curiosity’s background dose rate.", facts: `${Math.round(rate)} µGy/day${doseText}` };
}

export function assessSeismic(seismic) {
  return {
    status: "go",
    summary: `InSight located no sources inside Gale; the nearest epicenter was ~${seismic.nearestEpicenterKm.toLocaleString("en")} km away.`,
    facts: `${seismic.events.toLocaleString("en")} events cataloged · largest Mw ${seismic.largestMagnitude.toFixed(1)}`,
  };
}

/** Runs every check and the overall call. */
export function assessMission({ route, planResult, day, radiation, seismic, stormActive }) {
  const checks = [
    { key: "terrain", label: "Route & terrain", href: "#traverse", ...assessTerrain(route) },
    { key: "consumables", label: "Suit consumables", href: "#return", ...assessConsumables(planResult) },
    { key: "weather", label: "Weather", href: "#weather", ...assessWeather(day) },
    { key: "radiation", label: "Radiation", href: "#solar-storm", ...assessRadiation(radiation, planResult?.elapsed ?? null, stormActive) },
    { key: "seismic", label: "Marsquakes", href: "#marsquakes", ...assessSeismic(seismic) },
  ];
  const overall = worst(checks.map(check => check.status));
  return { checks, overall };
}
