import survey from "@/lib/data/survey.json";

const MISSIONS = ["Curiosity", "MRO HiRISE", "MAVEN", "InSight", "Perseverance", "SWIM"];
const detour = survey.routes.detour;

/** Opening section: what the planner is for, the walk at a glance, and where to start. */
export default function Hero() {
  return (
    <header className="hero">
      <div className="hero-copy">
        <p className="location">MARTIAN MAP <span></span> GALE CRATER <em className="coords">· 4.7° S 137.4° E</em></p>
        <h1>Namib Dune</h1>
        <p className="hero-lede">
          Plan the first human Marswalk to an active dune on Mars. Choose a safe route, budget your suit’s
          consumables, check the weather, radiation and ground below, then decide: go or no-go.
        </p>
        <div className="hero-actions">
          <a className="button-primary" href="#traverse">Start planning ↓</a>
          <a className="button-secondary" href="#readiness">Mission readiness</a>
        </div>
      </div>
      <dl className="hero-stats">
        <div><dt>Round trip</dt><dd>{`${Math.round(detour.distance * 2)} m`}</dd></div>
        <div><dt>Steepest slope</dt><dd>{`${detour.peakGrade.toFixed(1)}°`}</dd></div>
        <div><dt>Dune clearance</dt><dd>{`≥ ${Math.floor(detour.clearance)} m`}</dd></div>
        <div><dt>Data sources</dt><dd>{MISSIONS.length}</dd></div>
      </dl>
      <ul className="hero-missions" aria-label="NASA data sources">
        {MISSIONS.map(mission => <li key={mission}>{mission}</li>)}
      </ul>
    </header>
  );
}
