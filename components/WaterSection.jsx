"use client";

import { useState } from "react";
import dataset from "@/lib/data/water-isru.json";
import { METHODS_URL } from "@/lib/hooks";

const available = Boolean(dataset?.dan?.length);
const dan = dataset?.dan ?? [];
const active = dan.filter(point => point.mode === "Active");
const passive = dan.filter(point => point.mode === "Passive");
const gobabeb = dan.find(point => point.id === dataset?.gobabebSample);
const number = value => value.toFixed(2);
const estimate = point => `${number(point.weh)} ± ${number(point.uncertainty)} wt% WEH`;
const DEPTHS = [["shallow", "0–1 m"], ["middle", "1–5 m"], ["deep", "Below 5 m"]];

function swimReading(layer) {
  if (layer.score === null) return "No data in the Namib cell";
  const sign = layer.score < 0 ? "−" : layer.score > 0 ? "+" : "";
  const relation = layer.score < layer.threshold ? "below" : "meets";
  return `${sign}${number(Math.abs(layer.score))} at Namib · ${relation} the study’s +${number(layer.threshold)} threshold`;
}

export default function WaterSection({ selectedDanId, onSelectDan, onShowDanOnMap }) {
  const [depth, setDepth] = useState("shallow");

  const heading = (
    <div className="detail-heading">
      <div>
        <h2 id="water-title">Water &amp; ISRU</h2>
        <p>Compare Curiosity’s shallow hydrogen readings with NASA’s regional ice maps. In-situ resource utilization (ISRU) means using materials available at the site.</p>
      </div>
    </div>
  );

  if (!available) {
    return (
      <section className="detail-panel" id="water" aria-labelledby="water-title">
        {heading}
        <p className="section-note">The bundled water data could not be loaded.</p>
      </section>
    );
  }

  const point = dan.find(item => item.id === selectedDanId) ?? gobabeb;
  const latitude = `${Math.abs(point.lat).toFixed(5)}° ${point.lat < 0 ? "S" : "N"}`;
  const layer = dataset.swim[depth];
  const depthLabel = DEPTHS.find(([key]) => key === depth)[1];

  return (
    <section className="detail-panel" id="water" aria-labelledby="water-title">
      {heading}
      <div className="water-evidence">
        <section className="water-source" aria-labelledby="dan-title">
          <h3 id="dan-title">Curiosity DAN · Namib traverse</h3>
          <p className="section-note">DAN uses neutrons to estimate hydrogen in the upper ~60 cm. Water-equivalent hydrogen (WEH) expresses that hydrogen as a water mass fraction. The signal can include hydrogen bound in minerals.</p>
          <dl className="readings water-readings">
            <div><dt>Gobabeb-area sand · active sample</dt><dd id="dan-gobabeb">{estimate(gobabeb)}</dd></div>
            <div><dt>Records within the Namib map</dt><dd>{`${active.length} active · ${passive.length} passive`}</dd></div>
          </dl>
          <div className="water-actions">
            <button type="button" onClick={onShowDanOnMap}>Show DAN samples on map ↑</button>
            <span className="section-note">Circles show active samples. Squares show passive samples.</span>
          </div>
          <label htmlFor="dan-point">Inspect a DAN record</label>
          <select id="dan-point" value={point.id} onChange={event => onSelectDan(event.target.value)}>
            <option value={gobabeb.id}>{`Gobabeb-area sand · Active ${gobabeb.id}`}</option>
            {[active, passive].map(group => (
              <optgroup key={group[0].mode} label={group[0].mode}>
                {group.filter(item => item.id !== gobabeb.id).map(item => (
                  <option key={item.id} value={item.id}>{`${item.id} · ${number(item.weh)} wt% WEH`}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="section-note" role="status">
            {`${estimate(point)} · ${point.mode} · ${point.material} · ${latitude}, ${point.lon.toFixed(5)}° E`}
          </p>
          <p className="section-note">DAN records follow the rover’s path. Unmarked areas have no mapped estimate in this dataset. Deeper layers are beyond DAN’s sensing depth.</p>
          <p className="section-note">Across Curiosity’s broader Gale traverse through sol 3333, DAN estimates ranged from near zero to 6.1 ± 0.7 wt% WEH. At Gobabeb, heating sand in the rover’s SAM instrument released water at temperatures consistent with hydrogen bound in minerals.</p>
          <div className="data-links">
            <a href="/data/dan-namib.csv" download>Download local DAN estimates</a>
            <a href="https://zenodo.org/records/6974535">DAN derived data</a>
            <a href="https://doi.org/10.1029/2022JE007327">Gale traverse study</a>
            <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5815393/">Gobabeb sand study</a>
            <a href="https://pds-geosciences.wustl.edu/missions/msl/dan.htm">NASA DAN archive</a>
          </div>
        </section>
        <section className="water-source" aria-labelledby="swim-title">
          <h3 id="swim-title">NASA SWIM · Gale Crater region</h3>
          <p className="section-note">Subsurface Water Ice Mapping combines orbital evidence at ~3 km per cell. The marker shows Namib’s location within the larger Gale region.</p>
          <div className="water-actions" role="group" aria-label="SWIM depth">
            {DEPTHS.map(([key, label]) => (
              <button key={key} type="button" aria-pressed={depth === key} onClick={() => setDepth(key)}>{label}</button>
            ))}
          </div>
          <figure className="water-figure">
            <div className="water-map">
              <img src={`/data/swim-${depth}.png`} loading="lazy" decoding="async" alt={`Gale Crater regional ice consistency grid, ${depthLabel} depth`} />
              <span className="water-site" aria-hidden="true" style={{ left: `${layer.mapX}%`, top: `${layer.mapY}%` }}>
                <span>Namib</span>
              </span>
            </div>
            <figcaption className="water-key">
              <span><i className="swim-scale"></i>−1 against ice · 0 neutral · +1 supports ice</span>
              <span><i className="swim-nodata"></i>No data</span>
            </figcaption>
          </figure>
          <p className="water-score" role="status">{swimReading(layer)}</p>
          <p className="section-note">Scores describe agreement with buried ice. A neutral score leaves the question open. NASA’s 2023 northern map ends at the equator. These later composites cover Gale at 4.68° S, where orbital data still leave the presence of ice uncertain.</p>
          <div className="data-links">
            <a href="https://swim.psi.edu/SWIM4MIMProducts.php">SWIM depth maps</a>
            <a href="https://science.nasa.gov/resource/swim-map-shows-subsurface-water-ice-on-mars/">NASA 2023 map</a>
            <a href="https://www.usgs.gov/publications/subsurface-water-ice-mapping-mars-a-probabilistic-approach">Equatorial uncertainty study</a>
          </div>
        </section>
      </div>
      <section className="water-planning" aria-labelledby="water-planning-title">
        <h3 id="water-planning-title">ISRU planning</h3>
        <p className="section-note"><strong>Recoverable water at Namib remains unverified.</strong> Estimating a supply requires samples that identify the form of the water, the deposit’s depth and extent, and a test that measures extraction yield, energy use, and water quality.</p>
        <div className="data-links">
          <a href={`${METHODS_URL}#water-and-isru`}>Data and methods</a>
          <a href="#resource-exploration">Compare regional ice evidence ↑</a>
          <a href="#moxie-title">MOXIE oxygen results ↑</a>
        </div>
      </section>
    </section>
  );
}
