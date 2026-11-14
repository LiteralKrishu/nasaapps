import { describe, expect, it } from "vitest";
import survey from "@/lib/data/survey.json";
import readiness from "@/lib/data/readiness.json";
import { DEFAULTS, planFromInputs } from "@/lib/planner";
import { assessConsumables, assessMission, assessRadiation, assessTerrain, assessWeather } from "@/lib/readiness";
import { decodePlan, encodePlan, PLAN_DEFAULTS } from "@/lib/share";

const { detour, direct } = survey.routes;
const sols = readiness.weather.sols;
const day = sol => sols.find(item => item.sol === sol);

describe("readiness checks", () => {
  it("rates the detour go and the direct route no-go", () => {
    expect(assessTerrain(detour).status).toBe("go");
    expect(assessTerrain(direct).status).toBe("nogo");
  });

  it("grades suit margin", () => {
    expect(assessConsumables(planFromInputs(DEFAULTS, detour)).status).toBe("go");
    expect(assessConsumables(planFromInputs({ ...DEFAULTS, delay: "30" }, detour)).status).toBe("caution");
    expect(assessConsumables(planFromInputs({ ...DEFAULTS, delay: "120" }, detour)).status).toBe("nogo");
    expect(assessConsumables(null).status).toBe("incomplete");
  });

  it("flags cold nights and missing reports", () => {
    expect(assessWeather(day(1225)).status).toBe("caution");
    const mild = sols.find(item => item.airMin !== null && item.airMin > -85 && (item.windPeak ?? 0) < 10);
    expect(assessWeather(mild).status).toBe("go");
    expect(assessWeather({ sol: 1, airMin: null }).status).toBe("caution");
  });

  it("scales EVA dose with the storm scenario", () => {
    const quiet = assessRadiation(readiness.radiation, 1440, false);
    const storm = assessRadiation(readiness.radiation, 1440, true);
    expect(quiet.status).toBe("go");
    expect(storm.status).toBe("caution");
    expect(storm.facts).toMatch(/≈8378 µGy/);
  });

  it("takes the worst status overall", () => {
    const base = { planResult: planFromInputs(DEFAULTS, detour), radiation: readiness.radiation, seismic: readiness.seismic, stormActive: false };
    const mild = sols.find(item => item.airMin !== null && item.airMin > -85 && (item.windPeak ?? 0) < 10);
    expect(assessMission({ ...base, route: detour, day: mild }).overall).toBe("go");
    expect(assessMission({ ...base, route: detour, day: day(1225) }).overall).toBe("caution");
    expect(assessMission({ ...base, route: direct, day: mild }).overall).toBe("nogo");
    expect(assessMission({ ...base, planResult: null, route: direct, day: mild }).overall).toBe("incomplete");
  });
});

describe("plan links", () => {
  const context = { routes: survey.routes, sols: sols.map(item => item.sol) };

  it("omits defaults", () => {
    expect(encodePlan(PLAN_DEFAULTS)).toBe("");
  });

  it("round-trips a changed plan", () => {
    const plan = { route: "direct", sol: sols[3].sol, storm: true, inputs: { ...DEFAULTS, delay: "12.5" } };
    expect(decodePlan(encodePlan(plan), context)).toEqual(plan);
  });

  it("ignores unknown or invalid values", () => {
    const plan = decodePlan("route=moon&sol=99999&storm=yes&delay=1234567890123&evil=1", context);
    expect(plan.route).toBe("detour");
    expect(plan.sol).toBe(PLAN_DEFAULTS.sol);
    expect(plan.storm).toBe(false);
    expect(plan.inputs).toEqual(DEFAULTS);
    expect(plan).not.toHaveProperty("evil");
  });
});
