const MINERALS = [
  ["Plagioclase", 36.5, "36.5 ± 0.8%"],
  ["Olivine", 25.8, "25.8 ± 0.4%"],
  ["Augite", 22, "22.0 ± 0.4%"],
  ["Pigeonite", 10.6, "10.6 ± 0.4%"],
];

export default function GobabebSection({ onShowSamplingWeather }) {
  return (
    <section className="detail-panel" id="gobabeb" aria-labelledby="gobabeb-title">
      <div className="detail-heading">
        <div>
          <h2 id="gobabeb-title">Gobabeb science stop</h2>
          <p>Examine how wind sorts the sand on the western margin of Namib Dune.</p>
        </div>
        <div className="data-links">
          <a href="#traverse">View sampling area on map ↑</a>
          <a href="#weather" onClick={onShowSamplingWeather}>Weather on sampling sol ↓</a>
        </div>
      </div>
      <div className="science-layout">
        <div>
          <figure className="science-figure">
            <a href="/data/namib-ripples.webp">
              <img src="/data/namib-ripples.webp" width={2400} height={287} loading="lazy"
                alt="Small straight ripples between larger curved ripple crests across Namib Dune" />
            </a>
            <figcaption>Namib Dune, Mastcam, sol 1192. Trace the large, curved crests about 3 m apart, then look for smaller ripples between them. <a href="https://www.jpl.nasa.gov/images/pia20755-two-sizes-of-ripples-on-surface-of-martian-sand-dune/">NASA/JPL-Caltech/MSSS · PIA20755</a></figcaption>
          </figure>
          <figure className="science-figure">
            <a href="/data/namib-surface.webp">
              <img src="/data/namib-surface.webp" width={1000} height={241} loading="lazy" alt="Steep Namib Dune slip face seen from Curiosity" />
            </a>
            <figcaption>Namib’s downwind slip face. Curiosity photographed sand that had moved down the steep face. <a href="https://science.nasa.gov/photojournal/slip-face-on-downwind-side-of-namib-sand-dune-on-mars/">NASA/JPL-Caltech/MSSS · PIA20281</a></figcaption>
          </figure>
        </div>
        <div className="sample-results">
          <h3>What Curiosity measured</h3>
          <p>Curiosity scooped sand near small ripple crests. CheMin used X-ray diffraction on grains smaller than 150 µm. The four largest mineral shares below describe the crystalline portion of that sample.</p>
          <table className="data-table mineral-table">
            <caption>CheMin · crystalline mass fraction · ±1σ</caption>
            <tbody>
              {MINERALS.map(([name, value, label]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td><meter min={0} max={100} value={value} aria-label={`${name} crystalline mass fraction`}></meter></td>
                  <td>{label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>CheMin also estimated that 35 ± 15% of the whole sample was X-ray amorphous. <a href="https://doi.org/10.1002/2017JE005262">CheMin analysis, Table 1</a></p>
          <h3>Compare the size fractions</h3>
          <p>APXS measured 7.57 wt% magnesium oxide in the fine discard pile A (&lt;150 µm) and 11.50 wt% in coarse pile B (&gt;150 µm). The higher value in the coarse pile shows how grain size affects the chemistry measured at one site. <a href="https://doi.org/10.1002/2017JE005267">Campaign synthesis, Table 3</a></p>
          <h3>How the dunes hold heat</h3>
          <p>Mars Odyssey’s THEMIS instrument gave a field-wide apparent thermal inertia of 240 ± 20 J m⁻² K⁻¹ s⁻½. Models using Curiosity ground temperatures at Namib gave 170–200 in the same units. The observations cover different areas and help explain how sand heats and cools. <a href="https://doi.org/10.1029/2017JE005501">THEMIS analysis</a> · <a href="https://doi.org/10.1029/2021JE007076">Namib comparison</a></p>
        </div>
      </div>
    </section>
  );
}
