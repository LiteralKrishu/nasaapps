(() => {
  "use strict";

  const form = document.querySelector("#return-form");
  const get = id => document.getElementById(id);
  const fields = [...form.querySelectorAll("input")];
  const resources = [
    ["oxygen", "Oxygen"], ["co2", "CO₂ removal"], ["battery", "Battery"], ["cooling", "Cooling water"]
  ].map(([name, label]) => ({ name, label, cell: document.querySelector(`[data-balance="${name}"]`) }));
  const results = get("return-results");
  const status = get("return-status");
  const metrics = ["round-trip", "time-margin", "limiting-resource", "latest-departure"];
  const defaultRoute = document.querySelector("[data-route][aria-pressed=true]").dataset.route;
  let selectedRoute = { ...window.marsSurvey.routes[defaultRoute], name: defaultRoute };

  const epsilon = 1e-8;

  function minutes(value) {
    if (Math.abs(value) < epsilon) return "0.0 min";
    if (Math.abs(value) < 0.05) return value < 0 ? "−<0.1 min" : "<0.1 min";
    return `${value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)} min`;
  }

  function render() {
    const crossesDune = selectedRoute.hazardDistance > 0;
    get("return-route").textContent = `${selectedRoute.name === "direct" ? "Direct comparison" : "Namib detour"} · ${(selectedRoute.distance * 2).toFixed(1)} m`;
    const invalid = fields.filter(field => !field.validity.valid);
    for (const field of fields) field.setAttribute("aria-invalid", String(!field.validity.valid));

    if (invalid.length) {
      get("return-input-error").textContent = "Enter valid values in the marked fields to calculate the return budget.";
      for (const id of metrics) get(id).textContent = "—";
      for (const { cell } of resources) {
        cell.textContent = "—";
        delete cell.dataset.result;
      }
      results.dataset.result = "pending";
      status.textContent = "";
      get("travel-breakdown").textContent = "";
      return;
    }

    get("return-input-error").textContent = "";
    const values = Object.fromEntries(fields.map(field => [field.name, field.valueAsNumber]));
    const outbound = selectedRoute.distance / values.outbound / 60;
    const inbound = selectedRoute.distance / values.inbound / 60;
    const elapsed = outbound + values.stop + inbound;
    const budgets = resources.map(resource => ({
      ...resource,
      available: values[resource.name],
      reserve: values[resource.name + "Reserve"],
      usable: values[resource.name] - values[resource.name + "Reserve"]
    }));

    const limit = Math.min(...budgets.map(budget => budget.usable));
    const limiting = budgets.filter(budget => Math.abs(budget.usable - limit) < epsilon);
    const margin = limit - elapsed;
    const latestDeparture = limit - inbound;
    get("round-trip").textContent = minutes(elapsed);
    get("time-margin").textContent = minutes(margin);
    get("limiting-resource").textContent = limiting.map(budget => budget.label).join(", ");
    get("latest-departure").textContent = latestDeparture + epsilon < outbound
      ? "Return exceeds budget"
      : `${minutes(latestDeparture)} from start`;

    for (const budget of budgets) {
      const remaining = budget.available - elapsed;
      budget.cell.textContent = remaining < -epsilon
        ? `Depleted (${minutes(-remaining)} short)`
        : minutes(remaining);
      budget.cell.dataset.result = remaining + epsilon < budget.reserve ? "warning" : "ok";
    }

    const belowReserve = margin < -epsilon;
    const atReserve = Math.abs(margin) < epsilon;
    results.dataset.result = crossesDune || belowReserve || atReserve ? "warning" : "ok";
    const belowAtDeparture = budgets.filter(budget => budget.usable < -epsilon);
    const budgetStatus = belowAtDeparture.length
      ? `Below reserve at departure: ${belowAtDeparture.map(budget => budget.label).join(", ")}.`
      : belowReserve
      ? "One or more resources would fall below reserve before arrival."
      : atReserve ? "The limiting resource reaches reserve at arrival." : "All modeled resources are above reserve at arrival.";
    const terrainStatus = crossesDune ? " The selected route crosses the dune exclusion zone. Budget comparison only." : "";
    status.textContent = budgetStatus + terrainStatus;
    get("travel-breakdown").textContent = `${minutes(outbound)} outbound · ${minutes(values.stop)} at the stop · ${minutes(inbound)} returning`;
  }

  form.addEventListener("submit", event => event.preventDefault());
  form.addEventListener("input", render);
  form.addEventListener("reset", event => {
    event.preventDefault();
    for (const field of fields) field.value = field.defaultValue;
    render();
  });
  document.addEventListener("marswalk:route", event => {
    selectedRoute = event.detail;
    render();
  });
  render();
})();
