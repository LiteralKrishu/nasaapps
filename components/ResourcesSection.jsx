"use client";

import { useState } from "react";
import data from "@/lib/data/swim-resources.json";
import { METHODS_URL } from "@/lib/hooks";

const available = Boolean(data?.layers?.length && data?.sites?.length);

function status(score, depth) {
  if (score === null) return "No mapped value";
  return score >= depth.threshold ? "Meets study threshold" : "Below study threshold";
}

function SwimExplorer() {
  const [layerKey, setLayerKey] = useState(data.layers[0].key);
  const [siteKey, setSiteKey] = useState(data.sites[0].key);
  const [imageError, setImageError] = useState(false);
  const layer = data.layers.find(item => item.key === layerKey);
  const site = data.sites.find(item => item.key === siteKey);
  const score = site.scores[layer.key];
  const latitude = Math.abs(site.latitude).toFixed(2) + (site.latitude < 0 ? "° S" : "° N");

  const selectLayer = key => {
    setLayerKey(key);
    setImageError(false);
  };

  return (
    <div>
      <div className="resource-controls" role="group" aria-label="Subsurface depth">
        {data.layers.map(depth => (
          <button key={depth.key} type="button" aria-pressed={depth.key === layer.key} onClick={() => selectLayer(depth.key)}>
            {depth.depth}
          </button>
        ))}
      </div>
      <div className="swim-map-frame">
        <img
          key={layer.image} src={`/data/${layer.image}`} width={1440} height={480} onError={() => setImageError(true)}
          alt={`SWIM ice evidence at ${layer.depth}, from 60° S to 60° N. Blue areas meet the study threshold.`}
        />
        <div id="swim-markers" aria-label="Site markers">
          {data.sites.map(item => {
            const longitude = (item.longitude + 180) % 360 - 180;
            return (
              <button
                key={item.key} type="button" title={item.name} aria-label={item.name} aria-pressed={item.key === site.key}
                style={{ left: `${(longitude + 180) / 360 * 100}%`, top: `${(60 - item.latitude) / 120 * 100}%` }}
                onClick={() => setSiteKey(item.key)}
              />
            );
          })}
        </div>
      </div>
      <p className="section-note" hidden={!imageError}>The selected map image could not be loaded.</p>
      <ul className="swim-legend" aria-label="Ice evidence map legend">
        <li><span className="swim-below"></span>Below study threshold</li>
        <li><span className="swim-strong"></span><span>{`Meets threshold (${layer.threshold.toFixed(2)}–1.00)`}</span></li>
        <li><span className="swim-missing"></span>No mapped value</li>
      </ul>
      <div className="swim-inspect">
        <div>
          <label htmlFor="swim-resource-site">Inspect a location</label>
          <select id="swim-resource-site" value={site.key} onChange={event => setSiteKey(event.target.value)}>
            {data.sites.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}
          </select>
          <p className="section-note">{`${latitude} · ${site.longitude.toFixed(2)}° E`}</p>
        </div>
        <div className="swim-readout" role="status">
          <strong>{score === null ? "No mapped value" : `Cᵢ ${score.toFixed(3)}`}</strong>
          <span>
            {score === null
              ? `${site.name} · ${layer.depth}`
              : `${site.name} · ${layer.depth} · ${status(score, layer)} (${layer.threshold.toFixed(2)})`}
          </span>
        </div>
      </div>
      <details className="storm-data">
        <summary>Compare evidence across all depths</summary>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="SWIM site comparison table">
          <table className="data-table swim-table">
            <caption>SWIM ice-consistency scores at the selected locations</caption>
            <thead>
              <tr>
                <th scope="col">Location</th>
                {data.layers.map(depth => <th key={depth.key} scope="col">{depth.depth}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.sites.map(item => (
                <tr key={item.key} className={item.key === site.key ? "swim-selected-row" : undefined}>
                  <th scope="row">{item.name}</th>
                  {data.layers.map(depth => {
                    const value = item.scores[depth.key];
                    return <td key={depth.key}>{value === null ? "No mapped value" : `${value.toFixed(3)} · ${status(value, depth)}`}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="section-note">The SWIM score combines measurements that are more or less consistent with buried ice. The original cells are about 3 km wide at the equator. Ice presence, concentration, and extraction feasibility at a specific site require local evidence.</p>
      <div className="data-links">
        <a href={layer.source}>Original SWIM GeoTIFF</a>
        <a href="https://doi.org/10.3847/PSJ/ad9b24">Study and evidence thresholds</a>
        <a href={`${METHODS_URL}#water-ice-and-resources`}>Map and site methods</a>
        <a href="#water">Local water evidence at Namib ↓</a>
      </div>
    </div>
  );
}

export default function ResourcesSection() {
  return (
    <section className="detail-panel" id="resource-exploration" aria-labelledby="resources-title">
      <div className="detail-heading">
        <div>
          <h2 id="resources-title">Water ice &amp; resources</h2>
          <p>Explore regional evidence for buried water ice and results from Perseverance’s oxygen production experiment.</p>
        </div>
      </div>
      <h3>Regional ice evidence</h3>
      {available ? <SwimExplorer /> : <p className="section-note">The bundled SWIM maps could not be loaded.</p>}
      <article className="moxie-panel" aria-labelledby="moxie-title">
        <figure className="science-figure">
          <img src="/data/moxie.webp" width={1000} height={750} loading="lazy" alt="Gold-colored MOXIE instrument installed inside Perseverance" />
          <figcaption>MOXIE installed in Perseverance. <a href="https://science.nasa.gov/photojournal/moxie-all-tucked-in/">NASA/JPL-Caltech · PIA24203</a></figcaption>
        </figure>
        <div>
          <h3 id="moxie-title">MOXIE oxygen production</h3>
          <p>At Jezero Crater, Perseverance’s Mars Oxygen In-Situ Resource Utilization Experiment used solid-oxide electrolysis to split atmospheric carbon dioxide and produce oxygen.</p>
          <dl className="readings moxie-readings">
            <div><dt>Total oxygen</dt><dd>122 g</dd></div>
            <div><dt>Production runs</dt><dd>16</dd></div>
            <div><dt>Peak output rate</dt><dd>12 g/h</dd></div>
            <div><dt>Oxygen purity at peak</dt><dd>≥98%</dd></div>
          </dl>
          <p className="section-note">MOXIE made 9.8 g on its final run on August 7, 2023. The experiment used atmospheric CO₂ and vented the oxygen after measuring its purity.</p>
          <a href="https://www.jpl.nasa.gov/news/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/">NASA/JPL mission results</a>
        </div>
      </article>
    </section>
  );
}
