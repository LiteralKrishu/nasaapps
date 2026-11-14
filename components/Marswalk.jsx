"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import water from "@/lib/data/water-isru.json";
import { DEFAULTS as PLANNER_DEFAULTS } from "@/lib/planner";
import TraverseSection from "./TraverseSection";
import ReturnPlanner from "./ReturnPlanner";
import GobabebSection from "./GobabebSection";
import WaterSection from "./WaterSection";
import LazySection from "./LazySection";

// Heavy, data-rich sections load their code and data only when needed.
const placeholder = id => function Loading() {
  return <section id={id} className="lazy-placeholder" aria-busy="true" aria-label="Loading section" />;
};
const WeatherSection = dynamic(() => import("./WeatherSection"), { ssr: false, loading: placeholder("weather") });
const StormSection = dynamic(() => import("./StormSection"), { ssr: false, loading: placeholder("solar-storm") });
const ResourcesSection = dynamic(() => import("./ResourcesSection"), { ssr: false, loading: placeholder("resource-exploration") });
const QuakeSection = dynamic(() => import("./QuakeSection"), { ssr: false, loading: placeholder("marsquakes") });

const NAV = [
  ["traverse", "Traverse"],
  ["return", "Return to base"],
  ["gobabeb", "Gobabeb science"],
  ["weather", "Curiosity weather"],
  ["solar-storm", "Radiation & space weather"],
  ["water", "Water & ISRU"],
  ["resource-exploration", "Regional ice & MOXIE"],
  ["marsquakes", "Marsquakes"],
];

const danAvailable = Boolean(water?.dan?.length);

export default function Marswalk() {
  const mapRef = useRef(null);
  const [routeName, setRouteName] = useState("detour");
  const [layers, setLayers] = useState({
    imagery: true, contours: true, slope: false, hazard: true, history: true, dan: false,
  });
  const [selectedDanId, setSelectedDanId] = useState(water?.gobabebSample);
  const [weatherSol, setWeatherSol] = useState(1225);
  const [weatherView, setWeatherView] = useState("sol");
  const [plannerInputs, setPlannerInputs] = useState(PLANNER_DEFAULTS);

  const setLayer = useCallback((name, visible) => setLayers(current => ({ ...current, [name]: visible })), []);

  const showDanOnMap = useCallback(() => {
    setLayer("dan", true);
    mapRef.current?.focus({ preventScroll: true });
    mapRef.current?.scrollIntoView({ block: "center" });
  }, [setLayer]);

  const showSamplingWeather = useCallback(() => {
    setWeatherSol(1225);
    setWeatherView("sol");
  }, []);

  return (
    <main>
      <header className="masthead">
        <div>
          <p className="location">MARTIAN MAP <span></span> GALE CRATER</p>
          <h1>Namib Dune</h1>
          <p className="subtitle">Bagnold Dunes · A Marswalk around the slip face</p>
        </div>
        <div className="status">Marswalk planner</div>
      </header>
      <nav className="section-nav" aria-label="Planner sections">
        {NAV.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <TraverseSection
        mapRef={mapRef}
        routeName={routeName}
        onRouteChange={setRouteName}
        layers={layers}
        onLayerChange={setLayer}
        danAvailable={danAvailable}
        selectedDanId={selectedDanId}
        onSelectDan={setSelectedDanId}
      />
      <ReturnPlanner routeName={routeName} inputs={plannerInputs} onInputsChange={setPlannerInputs} />
      <GobabebSection onShowSamplingWeather={showSamplingWeather} />
      <LazySection id="weather">
        <WeatherSection sol={weatherSol} onSolChange={setWeatherSol} view={weatherView} onViewChange={setWeatherView} />
      </LazySection>
      <LazySection id="solar-storm"><StormSection /></LazySection>
      <WaterSection selectedDanId={selectedDanId} onSelectDan={setSelectedDanId} onShowDanOnMap={showDanOnMap} />
      <LazySection id="resource-exploration"><ResourcesSection /></LazySection>
      <LazySection id="marsquakes"><QuakeSection /></LazySection>

      <footer>
        <p>Terrain and imagery by USGS Astrogeology, NASA, JPL-Caltech, and the University of Arizona. Rover track from NASA PDS PLACES. Surface photo by NASA/JPL-Caltech.</p>
        <a href="/data/profile.csv" download>Download elevation data</a>
        <a href="https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m">USGS source ↗</a>
      </footer>
    </main>
  );
}
