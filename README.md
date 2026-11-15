# Gale Atlas

Gale Atlas is a Marswalk planner for Namib Dune in Gale Crater. Compare routes, check suit reserves, and make the go / no-go call.

[![NASA Space Apps Challenge 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-blue.svg)](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![Gale Atlas home page with Gale Crater marked on the Mars globe](docs/screenshots/hero.jpg)

## The problem

An astronaut at Gale Crater is 3 to 22 minutes from Mission Control, one way. Before stepping outside they need one view that answers practical questions. Is the route safe underfoot? Will the suit’s oxygen, CO₂ removal, battery and cooling last if something goes wrong at the stop? What are the weather, the radiation and the ground doing? NASA has measured all of this, but the measurements are spread across a dozen missions and archives.

## What the planner does

It opens on a 3D Mars that spins to Gale Crater and dives toward the landing site as you scroll. It brings data from Curiosity, the Mars Reconnaissance Orbiter, MAVEN, InSight, Perseverance and the SWIM ice maps together on one page. That page walks an astronaut through a Marswalk around Namib Dune, from route choice to a final go / no-go decision.

| Step | What you do | NASA data |
| --- | --- | --- |
| 01 · [Choose a route](components/TraverseSection.jsx) | Compare a detour that clears the dune with the direct line, on a zoomable map with slope, contours, Curiosity’s track and DAN samples, plus an elevation profile. Switch to **3D terrain** to orbit the dune and “walk the route” with the camera. | HiRISE 1 m DEM & orthophoto, PDS PLACES rover track, DAN |
| 02 · [Return to base](components/ReturnPlanner.jsx) | Enter walking paces, time at the stop, delays and suit consumables. See margin, the limiting resource, the latest departure and a trip timeline. | Route geometry from step 01 |
| 03 · [Go / no-go](components/ReadinessPanel.jsx) | Get one verdict from five checks: terrain, suit budget, weather on the chosen sol, radiation (with a solar-storm alert) and marsquakes. Share the plan as a link. | REMS, RAD, InSight catalog |
| 04 · [Gobabeb science](components/GobabebSection.jsx) | Explore what Curiosity learned from the dune sand it sampled. | Mastcam, CheMin, APXS |
| 05 · [Weather](components/WeatherSection.jsx) | Scrub through two Bagnold campaigns of air and ground temperature, pressure and wind. | Curiosity REMS |
| 06 · [Radiation](components/StormSection.jsx) | Replay the May 2024 solar storm at the surface and in orbit. | Curiosity RAD, MAVEN SEP |
| 07 · [Water & ISRU](components/WaterSection.jsx) | Compare shallow hydrogen readings with regional ice maps. | Curiosity DAN, SWIM |
| 08 · [Ice & MOXIE](components/ResourcesSection.jsx) | Compare ice evidence at candidate sites and review MOXIE’s oxygen results. | SWIM, Perseverance MOXIE |
| 09 · [Marsquakes](components/QuakeSection.jsx) | Browse 1,323 InSight events on a linked map and timeline, with Gale’s seismic context. | InSight SEIS catalog |

![Go / no-go readiness panel showing a no-go verdict for the direct route](docs/screenshots/readiness.jpg)

<table>
  <tr>
    <td><img src="docs/screenshots/traverse.jpg" alt="Traverse map with the detour route around the Namib Dune exclusion zone" /></td>
    <td width="28%"><img src="docs/screenshots/mobile.jpg" alt="Planner on a phone" /></td>
  </tr>
</table>

The [data and methods notes](docs/methods.md) explain every number on the page, including the go / no-go thresholds. Those thresholds are illustrative planning limits, not NASA flight rules.

## Run it

You need Node.js 20 or later.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` then `npm start` | Production build and server (the page is prerendered as static HTML) |
| `npm test` | Vitest unit tests for the return planner, readiness checks and plan links |
| `npm run lint` | ESLint with the Next.js Core Web Vitals rules |
| `npm run data:readiness` | Rebuilds the compact readiness summary after the Python builders refresh the data |
| `npm run data:terrain` | Rebuilds the 3D heightmap (`public/data/terrain.bin`) from `elevation.tif` |

### Deploy

The app is a standard Next.js project and deploys to [Vercel](https://vercel.com/new) with no configuration. Set `NEXT_PUBLIC_SITE_URL` to the public address if it is not on Vercel, so link previews resolve.

### Project layout

| Path | Contents |
| --- | --- |
| `app/` | Next.js App Router entry, global styles, icon and link-preview image |
| `components/` | One React component per step, plus the hero and section menu |
| `lib/` | Pure logic (`planner.js`, `readiness.js`, `share.js`, `quakes.js`) and JSON data in `lib/data/` |
| `public/data/` | Imagery, GeoTIFFs and CSV downloads |
| `scripts/` | Builders that regenerate the data from NASA archives |
| `tests/` | Unit tests |

### Built with

Next.js 16, React 19, plain CSS, SVG and Canvas, with [three.js](https://threejs.org) for the 3D globe and terrain and [GSAP](https://gsap.com) for the intro, scroll and readiness motion. There is no map or chart library: every layer and chart is drawn from the bundled NASA data. three.js, GSAP and the heavy sections load on demand, so the first page load carries only the route, planner and readiness data. All motion turns off under the reduced-motion setting.

## 📌 Challenge Information

* **Challenge Title:** Interplanetary Survival Guide: Martian Map
* **Year:** NASA Space Apps Challenge 2026
* **Official Challenge URL:** [https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/)
* **Organized By:** NASA Science Mission Directorate
* **Focus Area:** Human Planetary Exploration, Planetary GIS, Multi-Mission Data Fusion, Extravehicular Activity (EVA) Planning

### Official Challenge Excerpt
> "NASA has explored Mars robotically for decades, studying its extreme environment, mapping its surface, and collecting many types of data. Far from home, the first astronauts to set foot on Mars will want the best map possible, with information on the details of their routes and destinations, updates on current conditions, and the data needed to complete their mission quickly and safely.
>
> Your challenge is to create a layered, integrated view of a location or route on the Martian surface that pulls together data from multiple NASA science missions and could help a human explorer plan and carry out a successful Marswalk while conducting new and exciting science along the way."

---

## 📂 Research Documentation Index

The [challenge data audit](research/challenge-data-audit.md) checks 19 research topics and documents the datasets for Bagnold Dunes in Gale Crater.

| Document | File Link | Description |
| :--- | :--- | :--- |
| **Problem Statement & Requirements** | [`research/problem-statement.md`](research/problem-statement.md) | Challenge objectives, optional formats, and the team’s proposed deliverables. |
| **Mars Science & Survival Guide** | [`research/mars-research.md`](research/mars-research.md) | In-depth analysis of Mars geography, atmosphere, Armstrong limit, diurnal temperatures, radiation (GCR & SPE), perchlorate toxicity, and EVA constraints. |
| **NASA Data Sources & Integration Guide** | [`research/nasa-data-sources.md`](research/nasa-data-sources.md) | Comprehensive catalog of NASA datasets (MOLA, HiRISE, THEMIS, CTX, CRISM, REMS, MEDA, RAD, RIMFAX, Mars Trek WMS), resolutions, APIs, and multi-layer schema. |
| **Deep-Dive Martian Systems Guide** | [`research/martian-systems-deep-dive.md`](research/martian-systems-deep-dive.md) | Advanced planetary engineering deep-dive: gas partial pressures, boundary layer katabatic winds, InSight seismic data, subsurface glacial radar, MOXIE ISRU, cost-surface path algorithms, ECLSS life support, and 0.38g neurovestibular adaptation. |
| **Master Sources & Citations Directory** | [`research/sources-and-citations.md`](research/sources-and-citations.md) | Directory of NASA, USGS, ESA, and research references. |
| **Executive Research Summary** | [`research/research-summary.md`](research/research-summary.md) | Consolidated reference summary combining all findings for rapid mission planning and architectural design. |

---

## 🔬 Executive Summary of Research Findings

### 1. The Operational Problem on Mars
Future astronauts executing surface excursions ("Marswalks") must operate with near-total autonomy due to an absolute communication latency of **3.1 to 22.3 minutes each way** with Earth. Apollo moonwalkers had real-time Mission Control support; Martian astronauts must rely on onboard geospatial intelligence to survive:
* **Thin atmosphere.** Mean Martian surface pressure is about 6.1 hPa. For a Gale conditions display, use pressure observed by Curiosity at the chosen time. [REMS archive](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html)
* **Thermal cycling.** Use separate air and ground temperature records. The range varies with location, local time, and season. [Gale temperature and energy study](https://doi.org/10.1029/2020JE006804)
* **Radiation.** Curiosity RAD measured about 0.64 ± 0.12 mSv/day dose equivalent during an early, GCR-dominated interval. Solar particle events can raise the absorbed dose. [Early RAD measurements](https://doi.org/10.1126/science.1244797) · [JPL May 2024 event](https://www.jpl.nasa.gov/news/nasa-watches-mars-light-up-during-epic-solar-storm/)
* **Regolith and perchlorates.** The Phoenix lander measured 0.4–0.6% perchlorate by mass in its sampled soil. This is a Phoenix site result. [Phoenix soil analysis](https://doi.org/10.1126/science.1172466)
* **Terrain.** The route needs local elevation, slope, and evidence of loose sand and other obstacles. Use slope limits as adjustable simulation inputs and label gaps in terrain coverage. [Gale DEM](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m)

---

### 2. Multi-Layer NASA Data Architecture

The project synthesizes multi-mission datasets into an integrated 5-layer operational map:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ASTRONAUT TACTICAL MARSWALK MAP                      │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 5: Science Waypoints & ISRU (MRO CRISM & USGS Geologic Maps)     │
│          • Clays (Phyllosilicates), Sulfates, Hydrated Silica, Ice     │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 4: Space Weather & Microclimate (MSL RAD & M2020 MEDA / REMS)    │
│          • Cumulative Radiation Dose (mSv), Dust Tau, Ambient Temp     │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 3: Surface Material Context (Odyssey THEMIS)                    │
│          • Apparent Thermal Inertia                                   │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 2: Micro & Macro Topography / Slopes (MGS MOLA + MRO HiRISE DTM) │
│          • 463m Regional DEM + 1m Local DTM (Slope Hazards & Crevasses)│
├────────────────────────────────────────────────────────────────────────┤
│ Layer 1: High-Resolution Visual Orthomosaics (MRO CTX & HiRISE)        │
│          • 6m/px CTX Context Basemap + 0.25m/px HiRISE Feature Details │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Key NASA Missions & Datasets Summary

#### Core Challenge Portals & Benchmarks
1. **Jet Propulsion Laboratory’s (JPL) Mars Trek:** [https://trek.nasa.gov/mars/](https://trek.nasa.gov/mars/)  
   *NASA web-based portal for exploration of Mars, showcases data collected by NASA at various landing sites.*  
   *Utility:* Provides standardized OGC WMTS endpoints, 2D/3D viewers, and landing site dossiers.
2. **USGS-NASA Planetary Geologic Mapping Program:** [https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars](https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars)  
   *High-quality standardized geologic map of Mars.*  
   *Utility:* Peer-reviewed stratigraphic layers, structural fault lines, and geological epoch boundaries.
3. **Curiosity Rover Proposed Route Up Mount Sharp (Route Map Visual):** [https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/](https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/)  
   *This animation shows a proposed route for NASA's Curiosity rover, which is climbing lower Mount Sharp on Mars. The annotated version of the map labels different regions that scientists working with the rover would like to explore in coming years. A flyover video explains them in more detail.*  
   *Utility:* Prime visual benchmark for annotating mission corridors, scientific waypoints, and topography traversal.
4. **NASA Worldview:** [https://worldview.earthdata.nasa.gov/](https://worldview.earthdata.nasa.gov/)  
   *Visually explore the past and the present of this dynamic planet from a satellite's perspective. Select from an array of stories below to learn more about Worldview (a part of NASA Earthdata), the satellite imagery we provide and events occurring around the world.*  
   *Utility:* Architectural and UX model for timeline scrubbing, satellite multi-layer compositing, and dynamic opacity.
5. **Mars Perseverance Raw Images Gallery:** [https://mars.nasa.gov/mars2020/multimedia/raw-images/](https://mars.nasa.gov/mars2020/multimedia/raw-images/)  
   *Over 1 million images captured by the rover on its journey across the Mars surface.*  
   *Utility:* Ground-level first-person view (POV) Navcam/Mastcam imagery to preview terrain at each waypoint.

#### Multi-Mission Sensor Matrix
| Instrument | Spacecraft / Mission | Primary Data Type | Spatial Resolution | Official Access URL | Project Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MOLA** | Mars Global Surveyor | Laser Altimetry / DEM | 463 m/px (128 ppd) | [PDS MOLA](https://pds-geosciences.wustl.edu/missions/mgs/mola.html) | Macro-elevation grid & regional slope relief |
| **HiRISE** | Mars Reconnaissance Orbiter | Ultra-High-Res Optical & DTM | 0.25–0.3 m/px (1 m DTM) | [HiRISE Ops](https://hirise.lpl.arizona.edu/) | Boulder avoidance, crevasse detection & 1m slope profile |
| **CTX** | Mars Reconnaissance Orbiter | Panchromatic Context Mosaic | 6.0 m/px | [Caltech Murray CTX](https://murray-lab.caltech.edu/CTX/) | High-contrast visual base map across landing zones |
| **THEMIS** | 2001 Mars Odyssey | Thermal Infrared & Inertia | 100 m/px | [USGS thermal inertia mosaic](https://astrogeology.usgs.gov/search/map/mars-themis-derived-global-thermal-inertia-mosaic) | Thermophysical context for interpreting surface material |
| **CRISM** | Mars Reconnaissance Orbiter | Hyperspectral Mineralogy | 18–36 m/px | [JHU/APL CRISM](https://crism.jhuapl.edu/) | Scientific waypoint designation & hydrated mineral targets |
| **RAD** | MSL Curiosity Rover | Surface Radiation Dosimetry | In-situ point sensor | [PDS Planetary Plasma Interactions](https://pds-ppi.igpp.ucla.edu/mission/Mars_Science_Laboratory) | Historical radiation at Curiosity’s position |
| **MEDA / REMS** | Mars 2020 & Curiosity | Local weather records | In-situ point sensors | [PDS Atmospheres](https://pds-atmospheres.nmsu.edu/) | Archived measurements at Jezero and Gale, respectively |
| **RIMFAX** | Mars 2020 Perseverance | Ground-Penetrating Radar | Along rover track | [PDS Geosciences RIMFAX](https://pds-geosciences.wustl.edu/missions/mars2020/rimfax.htm) | Subsurface stratigraphy at Jezero |
| **Mars Trek** | NASA JPL | Web GIS Tile Services (WMTS) | Multi-resolution | [JPL Mars Trek](https://trek.nasa.gov/mars/) | Standardized tile endpoints for map visualization |
| **Geologic GIS** | USGS Astrogeology | Standard Stratigraphic Maps | 1:5,000,000 to 1:24,000 | [USGS Astrogeology](https://astrogeology.usgs.gov/) | Structural and geological epoch classification |

---

### 4. EVA Route Planning & Mission Walkthrough Criteria

The Bagnold Dunes planner shows Curiosity’s track, routes around and across the dune slip face, and the science behind the Gobabeb sample. The return calculator reports the round-trip time and resource margin using the paces and suit endurance you enter. The go / no-go panel combines terrain, suit budget, weather, radiation and seismic checks into one call. [Route and data methods](docs/methods.md)

---

### 5. Deep-Dive Planetary Systems & Survival Engineering Matrix

A synthesis of the advanced planetary science and physiological domains analyzed in [`research/martian-systems-deep-dive.md`](research/martian-systems-deep-dive.md):

| Domain | Key Data & Scientific Reality | Mission / Instrument Baseline | Operational Survival Impact |
| :--- | :--- | :--- | :--- |
| **Atmospheric Gases & Pressure** | Annual mean Gale composition includes 95.1% CO₂, 2.59% N₂, and 1.94% ⁴⁰Ar. | Curiosity SAM and REMS | Use local pressure observations and keep gas composition as site context. |
| **Wind** | Wind at Namib varied with the dune face and time of day. | Curiosity REMS and MarsWRF study | Use dated observations and show sampling gaps. |
| **Diurnal Thermal Cycling** | Air and ground temperatures vary with local time and season. | THEMIS and Curiosity REMS | Show distinct temperature series and their dates. |
| **Seismology & Geophysics** | InSight recorded marsquakes from one station in Elysium Planitia. | NASA InSight SEIS | Use as regional scientific context. |
| **Space Weather & Ionizing Radiation** | RAD recorded the surface event on 20 May 2024. MAVEN provides historical orbital observations. | Curiosity RAD and MAVEN SEP | Use a separate, dated event replay. |
| **Subsurface Hydrology & Ice** | SWIM maps regional evidence for buried water ice. | SWIM, MRO SHARAD, and Phoenix | Extraction at a site requires local confirmation. |
| **ISRU Oxygen Production** | MOXIE demonstrated 122 g total and a peak rate of 12 g/h. | Perseverance MOXIE | Provides technology context for future resource planning. |
| **Gravitational Adaptation** | Mars gravity is about 0.38 g. Sustained human adaptation is uncertain. | NASA partial-gravity research | Treat walking speed and fatigue as simulation inputs. |
| **Sol Temporal Tracking & Isolation** | A mean sol lasts 24 h 39 min 35.244 s. | NASA Mars24 and Mars500 Earth analog | Keep the local time convention and Earth timestamp with each observation. |

---

## 🔗 Official References & NASA Portals

> [!TIP]
> An exhaustive, categorized directory of every dataset URL, PDS node, and peer-reviewed paper citation is documented in **[`research/sources-and-citations.md`](research/sources-and-citations.md)**.

* **NASA Planetary Data System (PDS) Central Portal:** [https://pds.nasa.gov/](https://pds.nasa.gov/)
* **JPL Mars Trek Interactive GIS Portal:** [https://trek.nasa.gov/mars/](https://trek.nasa.gov/mars/)
* **USGS Planetary Geologic Mapping of Mars:** [https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars](https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars)
* **NASA Science Curiosity Proposed Path Up Mount Sharp:** [https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/](https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/)
* **NASA Worldview Satellite Engine:** [https://worldview.earthdata.nasa.gov/](https://worldview.earthdata.nasa.gov/)
* **Mars Perseverance Raw Images Gallery (1M+ Images):** [https://mars.nasa.gov/mars2020/multimedia/raw-images/](https://mars.nasa.gov/mars2020/multimedia/raw-images/)
* **University of Arizona HiRISE Operations Center & DTM Catalog:** [https://hirise.lpl.arizona.edu/](https://hirise.lpl.arizona.edu/) | [https://www.uahirise.org/dtm/](https://www.uahirise.org/dtm/)
* **Arizona State University THEMIS Thermal Infrared Portal:** [https://themis.asu.edu/](https://themis.asu.edu/)
* **Caltech Murray Lab Global CTX Mosaic:** [https://murray-lab.caltech.edu/CTX/](https://murray-lab.caltech.edu/CTX/)
* **NASA InSight SEIS Mission Archive:** [https://mars.nasa.gov/insight/](https://mars.nasa.gov/insight/) | [PDS SEIS](https://pds-geosciences.wustl.edu/missions/insight/seis.htm)
* **NASA Human Research Program (HRP):** [https://www.nasa.gov/hrp/](https://www.nasa.gov/hrp/)
* **NOAA Space Weather Prediction Center (SWPC):** [https://www.swpc.noaa.gov/](https://www.swpc.noaa.gov/)

