import survey from "@/lib/data/survey.json";
import HeroGlobe from "./HeroGlobe";

const detour = survey.routes.detour;

const STATS = [
  { label: "Detour round trip", value: Math.round(detour.distance * 2), unit: "m" },
  { label: "Peak slope", value: detour.peakGrade.toFixed(1), unit: "°" },
  { label: "Dune clearance", value: `≥ ${Math.floor(detour.clearance)}`, unit: "m" },
];

export default function Hero() {
  return (
    <header className="hero">
      <div className="hero-stage page-width">
        <div className="hero-copy">
          <p className="location">Gale Crater, Mars</p>
          <h1>Namib <br />Dune</h1>
          <p className="hero-lede">
            Plan a Marswalk to an active dune. Choose a route, check your suit reserves, and use NASA observations to make the go / no-go call.
          </p>
          <div className="hero-actions">
            <a className="button-primary" href="#traverse">Start planning <span aria-hidden="true">↓</span></a>
            <a className="button-secondary" href="#readiness">Mission readiness</a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit" aria-hidden="true" />
          <HeroGlobe />
          <div className="hero-globe-poster" aria-hidden="true" />
          <p className="hero-coordinates">4.7° S &nbsp; 137.4° E</p>
          <p className="hero-hint" aria-hidden="true">Drag to rotate</p>
        </div>
      </div>
      <dl className="hero-stats page-width">
        {STATS.map(({ label, value, unit }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}<span className="hero-stat-unit">{unit === "°" ? unit : ` ${unit}`}</span></dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
