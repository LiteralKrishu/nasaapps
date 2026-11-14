/** Encodes a Marswalk plan in URL query parameters so it can be shared as a link. */
import { DEFAULTS } from "@/lib/planner";

export const PLAN_DEFAULTS = { route: "detour", sol: 1225, storm: false, inputs: DEFAULTS };

export function encodePlan({ route, sol, storm, inputs }) {
  const params = new URLSearchParams();
  if (route !== PLAN_DEFAULTS.route) params.set("route", route);
  if (sol !== PLAN_DEFAULTS.sol) params.set("sol", String(sol));
  if (storm) params.set("storm", "1");
  for (const [name, value] of Object.entries(inputs)) {
    if (value !== DEFAULTS[name]) params.set(name, value);
  }
  return params.toString();
}

/** Reads only known keys; anything invalid falls back to the defaults (planner inputs are validated by the planner). */
export function decodePlan(search, { routes, sols }) {
  const params = new URLSearchParams(search);
  const plan = { ...PLAN_DEFAULTS, inputs: { ...DEFAULTS } };
  const route = params.get("route");
  if (route && Object.hasOwn(routes, route)) plan.route = route;
  const sol = Number(params.get("sol"));
  if (params.has("sol") && sols.includes(sol)) plan.sol = sol;
  plan.storm = params.get("storm") === "1";
  for (const name of Object.keys(DEFAULTS)) {
    const value = params.get(name);
    if (value !== null && value.length <= 12) plan.inputs[name] = value;
  }
  return plan;
}
