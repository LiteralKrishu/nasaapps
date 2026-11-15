"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { flushSync } from "react-dom";
import water from "@/lib/data/water-isru.json";
import survey from "@/lib/data/survey.json";
import readiness from "@/lib/data/readiness.json";
import { decodePlan, encodePlan, PLAN_DEFAULTS } from "@/lib/share";
import TraverseSection from "./TraverseSection";
import ReturnPlanner from "./ReturnPlanner";
import GobabebSection from "./GobabebSection";
import ReadinessPanel from "./ReadinessPanel";
import WaterSection from "./WaterSection";
import LazySection from "./LazySection";
import Hero from "./Hero";
import SectionNav from "./SectionNav";

// Heavy, data-rich sections load their code and data only when needed.
const placeholder = id => function Loading() {
  return <section id={id} className="lazy-placeholder" aria-busy="true" aria-label="Loading section" />;
};
// GSAP choreography loads right after hydration so it stays off the critical path.
const Motion = dynamic(() => import("./Motion"), { ssr: false });
const WeatherSection = dynamic(() => import("./WeatherSection"), { ssr: false, loading: placeholder("weather") });
const StormSection = dynamic(() => import("./StormSection"), { ssr: false, loading: placeholder("solar-storm") });
const ResourcesSection = dynamic(() => import("./ResourcesSection"), { ssr: false, loading: placeholder("resource-exploration") });
const QuakeSection = dynamic(() => import("./QuakeSection"), { ssr: false, loading: placeholder("marsquakes") });

const NAV = [
  ["traverse", "Traverse"],
  ["return", "Return to base"],
  ["readiness", "Go / no-go"],
  ["gobabeb", "Gobabeb science"],
  ["weather", "Weather"],
  ["solar-storm", "Radiation"],
  ["water", "Water & ISRU"],
  ["resource-exploration", "Ice & MOXIE"],
  ["marsquakes", "Marsquakes"],
];

const danAvailable = Boolean(water?.dan?.length);
const SOL_NUMBERS = readiness.weather.sols.map(item => item.sol);

export default function Marswalk() {
  const mapRef = useRef(null);
  const [routeName, setRouteName] = useState(PLAN_DEFAULTS.route);
  const [layers, setLayers] = useState({
    imagery: true, contours: true, slope: false, hazard: true, history: true, dan: false,
  });
  const [selectedDanId, setSelectedDanId] = useState(water?.gobabebSample);
  const [weatherSol, setWeatherSol] = useState(PLAN_DEFAULTS.sol);
  const [weatherView, setWeatherView] = useState("sol");
  const [plannerInputs, setPlannerInputs] = useState(PLAN_DEFAULTS.inputs);
  const [storm, setStorm] = useState(PLAN_DEFAULTS.storm);
  const [urlLoaded, setUrlLoaded] = useState(false);
  const [mapMode, setMapMode] = useState("2d");

  // Restore a shared plan from the address once on load, then keep the address in sync.
  useEffect(() => {
    const shared = decodePlan(window.location.search, { routes: survey.routes, sols: SOL_NUMBERS });
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from the URL, an external source */
    setRouteName(shared.route);
    setWeatherSol(shared.sol);
    setStorm(shared.storm);
    setPlannerInputs(shared.inputs);
    setUrlLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Fonts and measured charts shift the layout after the browser's first jump to #section; land again once settled.
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return undefined;
    let cancelled = false;
    const land = () => { if (!cancelled) document.getElementById(id)?.scrollIntoView({ behavior: "instant" }); };
    document.fonts.ready.then(() => requestAnimationFrame(land));
    const cancel = () => { cancelled = true; };
    window.addEventListener("wheel", cancel, { once: true, passive: true });
    window.addEventListener("touchstart", cancel, { once: true, passive: true });
    return () => {
      cancel();
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
    };
  }, []);

  const planQuery = encodePlan({ route: routeName, sol: weatherSol, storm, inputs: plannerInputs });
  useEffect(() => {
    if (!urlLoaded) return;
    const url = `${window.location.pathname}${planQuery ? `?${planQuery}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", url);
  }, [planQuery, urlLoaded]);

  const shareUrl = useCallback(
    () => `${window.location.origin}${window.location.pathname}${planQuery ? `?${planQuery}` : ""}#readiness`,
    [planQuery],
  );

  const setLayer = useCallback((name, visible) => setLayers(current => ({ ...current, [name]: visible })), []);

  const showDanOnMap = useCallback(() => {
    // DAN samples live on the 2D map; switch back to it before focusing.
    flushSync(() => {
      setMapMode("2d");
      setLayer("dan", true);
    });
    mapRef.current?.focus({ preventScroll: true });
    mapRef.current?.scrollIntoView({ block: "center" });
  }, [setLayer]);

  const showSamplingWeather = useCallback(() => {
    setWeatherSol(1225);
    setWeatherView("sol");
  }, []);

  return (
    <main id="top">
      <Motion />
      <Hero />
      <SectionNav items={NAV} />

      <section className="traverse-panel" id="traverse" aria-labelledby="traverse-title">
        <div className="detail-heading">
          <div>
            <h2 id="traverse-title">Choose a route</h2>
            <p>Compare the Namib detour with the direct line across HiRISE imagery, slope, contours and the dune exclusion zone.</p>
          </div>
        </div>
        <TraverseSection
          mapRef={mapRef}
          mapMode={mapMode}
          onMapModeChange={setMapMode}
          routeName={routeName}
          onRouteChange={setRouteName}
          layers={layers}
          onLayerChange={setLayer}
          danAvailable={danAvailable}
          selectedDanId={selectedDanId}
          onSelectDan={setSelectedDanId}
        />
      </section>
      <ReturnPlanner routeName={routeName} inputs={plannerInputs} onInputsChange={setPlannerInputs} />
      <ReadinessPanel
        routeName={routeName}
        plannerInputs={plannerInputs}
        sol={weatherSol}
        onSolChange={setWeatherSol}
        storm={storm}
        onStormChange={setStorm}
        shareUrl={shareUrl}
      />
      <GobabebSection onShowSamplingWeather={showSamplingWeather} />
      <LazySection id="weather">
        <WeatherSection sol={weatherSol} onSolChange={setWeatherSol} view={weatherView} onViewChange={setWeatherView} />
      </LazySection>
      <LazySection id="solar-storm"><StormSection /></LazySection>
      <WaterSection selectedDanId={selectedDanId} onSelectDan={setSelectedDanId} onShowDanOnMap={showDanOnMap} />
      <LazySection id="resource-exploration"><ResourcesSection /></LazySection>
      <LazySection id="marsquakes"><QuakeSection /></LazySection>

      <footer className="site-footer">
        <div>
          <p className="footer-title">Marswalk planner · NASA Space Apps Challenge 2026</p>
          <p>Terrain and imagery by USGS Astrogeology, NASA, JPL-Caltech, and the University of Arizona. Rover track from NASA PDS PLACES. Weather from Curiosity REMS, radiation from Curiosity RAD and MAVEN SEP, water evidence from Curiosity DAN and SWIM, seismic events from InSight. Surface photos by NASA/JPL-Caltech.</p>
        </div>
        <div className="data-links">
          <a href="/data/profile.csv" download>Download elevation data</a>
          <a href="https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m">USGS terrain source ↗</a>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </main>
  );
}
