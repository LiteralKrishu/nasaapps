import survey from "@/lib/data/survey.json";
import HeroGlobe from "./HeroGlobe";

const MISSIONS = ["Curiosity", "MRO HiRISE", "MAVEN", "InSight", "Perseverance", "SWIM"];
const detour = survey.routes.detour;

const STATS = [
  { label: "Round trip", value: Math.round(detour.distance * 2), decimals: 0, suffix: " m" },
  { label: "Steepest slope", value: detour.peakGrade, decimals: 1, suffix: "°" },
  { label: "Dune clearance", value: Math.floor(detour.clearance), decimals: 0, prefix: "≥ ", suffix: " m" },
  { label: "Data sources", value: MISSIONS.length, decimals: 0 },
];

/** Opening section: what the planner is for, the walk at a glance, and where to start. */
export default function Hero() {
  return (
    <header className="hero">
      <HeroGlobe />
      <div className="hero-copy">
        <p className="location" data-intro>MARTIAN MAP <span></span> GALE CRATER <em className="coords">· 4.7° S 137.4° E</em></p>
        <h1 data-intro="split">Namib Dune</h1>
        <p className="hero-lede" data-intro>
          Plan the first human Marswalk to an active dune on Mars. Choose a safe route, budget your suit’s
          consumables, check the weather, radiation and ground below, then decide: go or no-go.
        </p>
        <div className="hero-actions" data-intro>
          <a className="button-primary" href="#traverse">Start planning ↓</a>
          <a className="button-secondary" href="#readiness">Mission readiness</a>
        </div>
      </div>
      <dl className="hero-stats" data-intro="stagger">
        {STATS.map(({ label, value, decimals, prefix = "", suffix = "" }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd data-count={value} data-decimals={decimals} data-prefix={prefix} data-suffix={suffix}>
              {`${prefix}${value.toFixed(decimals)}${suffix}`}
            </dd>
          </div>
        ))}
      </dl>
      <ul className="hero-missions" aria-label="NASA data sources" data-intro="stagger">
        {MISSIONS.map(mission => <li key={mission}>{mission}</li>)}
      </ul>
      <p className="hero-hint" aria-hidden="true" data-intro>Drag the planet · scroll to descend</p>
    </header>
  );
}
