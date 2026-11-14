"use client";

import survey from "@/lib/data/survey.json";
import { DEFAULTS, FIELD_RULES, PACE_FIELDS, RESOURCES, minutes, planFromInputs, validate } from "@/lib/planner";

export default function ReturnPlanner({ routeName, inputs, onInputsChange }) {
  const route = survey.routes[routeName];
  const { validity, valid } = validate(inputs);
  const result = planFromInputs(inputs, route);

  const field = name => ({
    name,
    type: "number",
    ...FIELD_RULES[name],
    value: inputs[name],
    required: true,
    "aria-invalid": String(!validity[name]),
    onChange: event => onInputsChange(current => ({ ...current, [name]: event.target.value })),
  });

  return (
    <section className="detail-panel" id="return" aria-labelledby="return-title">
      <div className="detail-heading">
        <div>
          <h2 id="return-title">Return to base</h2>
          <p>Plan the round trip on the selected traverse and see how much time you have for science and delays.</p>
        </div>
        <span className="data-tag">
          {`${routeName === "direct" ? "Direct comparison" : "Namib detour"} · ${(route.distance * 2).toFixed(1)} m`}
        </span>
      </div>
      <form
        onSubmit={event => event.preventDefault()}
        onReset={event => { event.preventDefault(); onInputsChange(DEFAULTS); }}
      >
        <div className="pace-fields">
          {PACE_FIELDS.map(({ name, label, unit }) => (
            <label key={name}>{label} <span>{unit}</span><input {...field(name)} /></label>
          ))}
        </div>
        <table className="data-table budget-table">
          <caption>Suit endurance and reserve in Earth minutes</caption>
          <thead>
            <tr>
              <th scope="col">Resource</th>
              <th scope="col" id="available-col">At departure</th>
              <th scope="col" id="reserve-col">Minimum reserve</th>
              <th scope="col">At return</th>
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map(({ name, label }) => (
              <tr key={name}>
                <th scope="row" id={`${name}-label`}>{label}</th>
                <td><input {...field(name)} aria-labelledby={`${name}-label available-col`} /></td>
                <td><input {...field(name + "Reserve")} aria-labelledby={`${name}-label reserve-col`} /></td>
                <td data-result={result?.balances[name].result}>{result ? result.balances[name].text : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="form-actions">
          <p className="form-error" aria-live="polite">
            {valid ? "" : "Enter valid values in the marked fields to calculate the return budget."}
          </p>
          <button type="reset">Reset inputs</button>
        </div>
      </form>
      <div className="planner-result" data-result={result ? result.result : "pending"}>
        <dl className="readings">
          <div><dt>Round trip</dt><dd>{result ? minutes(result.elapsed) : "—"}</dd></div>
          <div><dt>Time margin</dt><dd>{result ? minutes(result.margin) : "—"}</dd></div>
          <div><dt>Limiting resource</dt><dd>{result ? result.limitLabel : "—"}</dd></div>
          <div><dt>Latest departure from stop</dt><dd>{result ? result.latestDeparture : "—"}</dd></div>
        </dl>
        <p id="return-status" role="status">{result?.status ?? ""}</p>
      </div>
      <section id="return-timeline" className="return-timeline" aria-labelledby="return-timeline-title" hidden={!result}>
        <h3 id="return-timeline-title">Trip timeline</h3>
        <p className="section-note">{result?.reserveNote}</p>
        <div className="return-track" aria-hidden="true">
          <div id="return-track-phases">
            {result?.segments.map(segment => <span key={segment.key} data-phase={segment.key} style={{ width: segment.width }} />)}
          </div>
          <i id="return-reserve-marker" hidden={!result || result.markerHidden} style={{ left: result?.markerLeft }} />
        </div>
        <dl id="return-phases" className="readings">
          {result?.segments.map(segment => (
            <div key={segment.key} data-phase={segment.key}>
              <dt>{segment.label}</dt>
              <dd>{minutes(segment.duration)}</dd>
              <span>{`${minutes(segment.start).replace(" min", "")}–${minutes(segment.end)} from start`}</span>
            </div>
          ))}
        </dl>
      </section>
      <p className="section-note">The simulation uses the same path both ways and assumes constant resource use. Enter average walking paces and suit endurance for the planned workload. Delays are modeled at the stop before return. The starting values are illustrative.</p>
    </section>
  );
}
