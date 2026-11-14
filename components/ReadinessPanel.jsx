"use client";

import { useState } from "react";
import survey from "@/lib/data/survey.json";
import readiness from "@/lib/data/readiness.json";
import { planFromInputs } from "@/lib/planner";
import { LEVEL_LABELS, THRESHOLDS, assessMission } from "@/lib/readiness";

const SOLS = readiness.weather.sols;
const PHASES = readiness.weather.phases;
const PHASE_NAMES = ["Phase 1 · Namib campaign", "Phase 2 · Later Bagnold campaign"];
const VERDICTS = {
  go: "All checks pass. The Marswalk can proceed as planned.",
  caution: "Proceed only with the mitigations below.",
  nogo: "Do not start this Marswalk. Change the plan first.",
  incomplete: "Finish the plan to get a verdict.",
};

/** Step 03: one go / caution / no-go call built from every other section. */
export default function ReadinessPanel({ routeName, plannerInputs, sol, onSolChange, storm, onStormChange, shareUrl }) {
  const [copied, setCopied] = useState("");
  const route = survey.routes[routeName];
  const day = SOLS.find(item => item.sol === sol);
  const { checks, overall } = assessMission({
    route,
    planResult: planFromInputs(plannerInputs, route),
    day,
    radiation: readiness.radiation,
    seismic: readiness.seismic,
    stormActive: storm,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied("Plan link copied to clipboard.");
    } catch {
      setCopied("Copy failed. The page address already contains this plan.");
    }
    window.setTimeout(() => setCopied(""), 3500);
  };

  return (
    <section className="detail-panel readiness" id="readiness" aria-labelledby="readiness-title" data-status={overall}>
      <div className="detail-heading">
        <div>
          <h2 id="readiness-title">Go / no-go</h2>
          <p>One call from every layer of the plan. Change the route, suit budget, sol or space weather and the verdict updates.</p>
        </div>
        <div className="readiness-share">
          <button type="button" onClick={copy}>Copy plan link</button>
          <span role="status" className="section-note">{copied}</span>
        </div>
      </div>

      <div className="readiness-grid">
        <div className="readiness-verdict" role="status" aria-live="polite">
          <span className="readiness-label">Mission readiness</span>
          <strong className="status-pill" data-status={overall}>{LEVEL_LABELS[overall]}</strong>
          <p>{VERDICTS[overall]}</p>
          <div className="readiness-controls">
            <label htmlFor="readiness-sol">EVA sol</label>
            <select id="readiness-sol" value={sol} onChange={event => onSolChange(Number(event.target.value))}>
              {PHASES.map(([start, end], index) => (
                <optgroup key={start} label={PHASE_NAMES[index]}>
                  {SOLS.filter(item => item.sol >= start && item.sol <= end).map(item => (
                    <option key={item.sol} value={item.sol}>{`Sol ${item.sol} · ${item.date}`}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <label className="layer readiness-toggle">
              <span className="swatch hazard"></span>Solar particle event alert
              <input type="checkbox" checked={storm} onChange={event => onStormChange(event.target.checked)} />
            </label>
          </div>
        </div>

        <ol className="readiness-checks">
          {checks.map(check => (
            <li key={check.key} data-status={check.status}>
              <span className="status-dot" aria-hidden="true"></span>
              <div>
                <div className="readiness-check-head">
                  <h3>{check.label}</h3>
                  <span className="status-pill small" data-status={check.status}>{LEVEL_LABELS[check.status]}</span>
                </div>
                <p>{check.summary}</p>
                {check.facts && <p className="readiness-facts">{check.facts}</p>}
              </div>
              <a href={check.href} aria-label={`Review ${check.label}`}>Review →</a>
            </li>
          ))}
        </ol>
      </div>
      <p className="section-note">
        {`Illustrative planning limits, not NASA flight rules: caution above ${THRESHOLDS.slopeCaution}° slope and no-go above ${THRESHOLDS.slopeNoGo}°, caution under ${THRESHOLDS.marginCaution} min of suit margin, caution for overnight air at or below −${Math.abs(THRESHOLDS.coldCaution)} °C or 30-minute winds of ${THRESHOLDS.windCaution} m/s or more. The radiation alert replays Curiosity’s May 2024 peak dose rate. Weather comes from the Curiosity sol you choose.`}
      </p>
    </section>
  );
}
