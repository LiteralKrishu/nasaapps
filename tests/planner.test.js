import { describe, expect, it } from "vitest";
import survey from "@/lib/data/survey.json";
import { DEFAULTS, isValid, minutes, plan, planFromInputs, validate } from "@/lib/planner";

const numbers = inputs => Object.fromEntries(Object.entries(inputs).map(([name, raw]) => [name, Number(raw)]));
const detour = survey.routes.detour;
const direct = survey.routes.direct;

describe("isValid", () => {
  const rules = { min: 0.05, max: 5, step: 0.01 };
  it("accepts values on the step grid within limits", () => {
    expect(isValid("0.70", rules)).toBe(true);
    expect(isValid("5", rules)).toBe(true);
    expect(isValid("0.05", rules)).toBe(true);
  });
  it("rejects empty, out-of-range, off-step and non-numeric input", () => {
    expect(isValid("", rules)).toBe(false);
    expect(isValid("  ", rules)).toBe(false);
    expect(isValid("0.04", rules)).toBe(false);
    expect(isValid("5.01", rules)).toBe(false);
    expect(isValid("0.705", rules)).toBe(false);
    expect(isValid("abc", rules)).toBe(false);
  });
});

describe("validate", () => {
  it("passes the defaults", () => {
    expect(validate(DEFAULTS).valid).toBe(true);
  });
  it("flags the offending field", () => {
    const { valid, validity } = validate({ ...DEFAULTS, inbound: "0" });
    expect(valid).toBe(false);
    expect(validity.inbound).toBe(false);
    expect(validity.outbound).toBe(true);
  });
  it("returns no plan for invalid inputs", () => {
    expect(planFromInputs({ ...DEFAULTS, stop: "-1" }, detour)).toBeNull();
  });
});

describe("minutes", () => {
  it("formats durations", () => {
    expect(minutes(0)).toBe("0.0 min");
    expect(minutes(12.34)).toBe("12.3 min");
    expect(minutes(-3)).toBe("−3.0 min");
    expect(minutes(0.01)).toBe("<0.1 min");
  });
});

describe("plan", () => {
  const result = plan(numbers(DEFAULTS), detour);
  const outbound = detour.distance / 0.7 / 60;
  const inbound = detour.distance / 0.6 / 60;

  it("sums the four phases into the round trip", () => {
    expect(result.elapsed).toBeCloseTo(outbound + 15 + inbound, 6);
    expect(result.segments.map(segment => segment.key)).toEqual(["outbound", "stop", "inbound"]);
  });

  it("uses the smallest usable budget as the limit", () => {
    // Usable minutes: oxygen 70, CO₂ 80, battery 85, cooling water 60.
    expect(result.limitLabel).toBe("Cooling water");
    expect(result.margin).toBeCloseTo(60 - result.elapsed, 6);
  });

  it("is ok on the detour with default budgets", () => {
    expect(result.result).toBe("ok");
    expect(result.status).toMatch(/above reserve/);
  });

  it("warns when the route crosses the dune", () => {
    const crossing = plan(numbers(DEFAULTS), direct);
    expect(direct.hazardDistance).toBeGreaterThan(0);
    expect(crossing.result).toBe("warning");
    expect(crossing.status).toMatch(/dune exclusion zone/);
  });

  it("warns and reports depletion when a long delay exhausts a resource", () => {
    const late = plan({ ...numbers(DEFAULTS), delay: 120 }, detour);
    expect(late.result).toBe("warning");
    expect(late.margin).toBeLessThan(0);
    expect(late.balances.cooling.result).toBe("warning");
    expect(late.balances.cooling.text).toMatch(/Depleted/);
  });

  it("flags resources already below reserve at departure", () => {
    const short = plan({ ...numbers(DEFAULTS), oxygen: 10 }, detour);
    expect(short.status).toMatch(/Below reserve at departure: Oxygen/);
    expect(short.markerHidden).toBe(true);
  });
});
