# Executive Research Summary: Interplanetary Survival Guide — Martian Map
## NASA Space Apps Challenge 2026 Reference Document

---

## 1. Challenge & Problem Statement Overview

* **Challenge Name:** Interplanetary Survival Guide: Martian Map
* **Official URL:** [https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/)
* **Official Prompt:** Create a layered, integrated view of a location or route on the Martian surface that pulls together data from multiple NASA science missions to help human explorers plan and carry out a successful Marswalk while conducting new and exciting science along the way.
* **The Core Problem:** Unlike Apollo lunar missions with instantaneous ground communication, astronauts on Mars will operate under a 3.1-to-22.3-minute one-way communication latency. They must survive lethal surface conditions (near-vacuum pressure, radiation, sub-zero cold, and perchlorate dust) using localized, highly autonomous navigation and decision-support tools.
* **Challenge scope.** The brief asks for an integrated view from multiple NASA missions. It suggests at least three data types and permits static, historical and modeled views. The team’s proposed deliverable is one simulated Marswalk with a science stop and a documented detour. [Challenge brief](https://hackathlone.com/challenges/interplanetary-survival-guide-martian-map)
* **Prototype data.** Start with the [challenge data audit](challenge-data-audit.md) and the [sample Gale weather observations](data/gale-rems-sam-weather-samples.csv).

---

## 2. Key Martian Environmental Realities & Astronaut Hazards

| Hazard / Parameter | Environmental Reality on Mars | Physiological & Operational Impact | Mitigation & System Requirement |
| :--- | :--- | :--- | :--- |
| **Atmospheric Pressure** | Global reference about 6.1 hPa. Pressure at Gale varies with time and location. | The crew needs a pressurized environment. | Use dated REMS pressure for the local conditions view. |
| **Atmospheric Composition** | Gale annual means include 95.1% CO₂, 2.59% N₂, 1.94% ⁴⁰Ar, and 0.161% O₂. | The ambient atmosphere cannot support breathing. | Use SAM composition as site context. |
| **Surface Temperature** | Air and ground temperatures vary with local time and season. | Thermal loads vary by conditions and equipment. | Keep the air and ground observations separate. |
| **Radiation Environment** | Early Gale dose equivalent was about 0.64 ± 0.12 mSv/day. JPL reported 8,100 µGy absorbed dose for the 20 May 2024 solar event. | Exposure depends on date, location, and shielding. | Show dated measurements and preserve Gy and Sv as separate units. |
| **Regolith & Perchlorates** | Phoenix measured 0.4–0.6% perchlorate by mass in samples from its site. | Dust and soil chemistry matter for crew exposure. | Use local data for any route-level concentration. |
| **Topography & Traversability** | Slopes, loose sand, scarps, and coarse obstacles can affect mobility. | Route limits depend on the traveler and equipment. | Derive slope from local elevation and review hazards in orbital and rover images. |
| **Light & Vision** | Low atmospheric scatter produces harsh shadows and flat lighting in diffuse dust haze | Inability to judge subtle terrain depressions, cracks, and boulder obstacles. | High-contrast hillshade elevation overlays and visual odometry landmarks. |

---

## 3. NASA Planetary Data Sources & Multi-Layer Schema

To build an interplanetary map, data from distinct robotic missions is layered into a unified operational stack:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MARSWALK TACTICAL INTERFACE STACK                    │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 5: Science Waypoints & Astrobiology Targets                     │
│          • MRO CRISM (Hydrated Clays, Carbonates, Sulfates)            │
│          • USGS Geologic Maps (Stratigraphy & Formation Ages)          │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 4: Historical Space Weather & Atmosphere                        │
│          • Curiosity RAD surface radiation at the rover               │
│          • Curiosity REMS at Gale or Perseverance MEDA at Jezero      │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 3: Surface Material Context                                     │
│          • 2001 Mars Odyssey THEMIS (Apparent Thermal Inertia)         │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 2: Micro & Macro Topography / Slope Hazards                     │
│          • MGS MOLA (463m Regional DEM & Elevation Profile)            │
│          • MRO HiRISE DTM (1.0m Sub-meter Stereo Elevation & Obstacles)│
├────────────────────────────────────────────────────────────────────────┤
│ Layer 1: High-Resolution Visual Orthomosaics                          │
│          • MRO CTX (6m/px Regional Context Mosaic)                     │
│          • MRO HiRISE (0.25m/px Ultra-High-Resolution Feature Base)    │
└────────────────────────────────────────────────────────────────────────┘
```

### Official NASA Challenge Data Portals & Resources

The challenge prompt explicitly highlights five core NASA and USGS resources:

1. **Jet Propulsion Laboratory’s (JPL) Mars Trek:**  
   * **URL:** [https://trek.nasa.gov/mars/](https://trek.nasa.gov/mars/)  
   * **NASA Description:** NASA web-based portal for exploration of Mars, showcases data collected by NASA at various landing sites.  
   * **Project Integration:** Serves as the primary reference for interactive 2D/3D map tiles, landing site dossiers, and standardized OGC WMTS endpoints.
2. **USGS-NASA Planetary Geologic Mapping Program:**  
   * **URL:** [https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars](https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars)  
   * **NASA Description:** High-quality standardized geologic map of Mars.  
   * **Project Integration:** Provides peer-reviewed geologic stratigraphy, age classifications (Noachian/Hesperian/Amazonian), and structural fault vectors.
3. **Curiosity Rover Proposed Route Up Mount Sharp (Visual Benchmark):**  
   * **URL:** [https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/](https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/)  
   * **NASA Description:** This animation shows a proposed route for NASA's Curiosity rover, which is climbing lower Mount Sharp on Mars. The annotated version of the map labels different regions that scientists working with the rover would like to explore in coming years. A flyover video explains them in more detail.  
   * **Project Integration:** Directly guides our traversal visualization model—labeling scientific stop regions, hazard bypasses, and ascent corridors.
4. **NASA Worldview:**  
   * **URL:** [https://worldview.earthdata.nasa.gov/](https://worldview.earthdata.nasa.gov/)  
   * **NASA Description:** Visually explore the past and the present of this dynamic planet from a satellite's perspective. Select from an array of stories below to learn more about Worldview (a part of NASA Earthdata), the satellite imagery we provide and events occurring around the world.  
   * **Project Integration:** Inspires our UI/UX layout for multi-layer satellite toggling, opacity mixing, and diurnal/seasonal timeline scrubbing.
5. **Mars Perseverance Raw Images Gallery:**  
   * **URL:** [https://mars.nasa.gov/mars2020/multimedia/raw-images/](https://mars.nasa.gov/mars2020/multimedia/raw-images/)  
   * **NASA Description:** Over 1 million images captured by the rover on its journey across the Mars surface.  
   * **Project Integration:** Provides Jezero surface views. The Gale demo uses Curiosity images at its own waypoints.

---

### Detailed Mission & Dataset Matrix

| Dataset / Sensor | Spacecraft | Spectral / Data Type | Resolution | Data Access URL | Key Role in Project |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **JPL Mars Trek** | NASA JPL | Web GIS Tile Services (WMTS)| Multi-scale | [JPL Mars Trek](https://trek.nasa.gov/mars/) | Standard OGC tile endpoints to feed Leaflet/Cesium map viewports. |
| **USGS Mars GIS** | USGS Astrogeology | Geologic Map Vector Layers | 1:5M to 1:24k | [USGS Interactive Maps](https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars) | Standardized planetary geologic units and age classifications. |
| **Mount Sharp Route** | NASA Science / MSL | Annotated Traversal Visual | Perspective | [Curiosity Route Visual](https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/) | Benchmark for waypoint annotation and safe corridor plotting. |
| **NASA Worldview** | NASA Earthdata | Multi-layer Satellite Engine | Dynamic | [NASA Worldview](https://worldview.earthdata.nasa.gov/) | Architectural reference for temporal scrubbing and layer toggling. |
| **Perseverance Gallery** | Mars 2020 Rover | Surface imagery | Rover camera frames | [Perseverance Raw Images](https://mars.nasa.gov/mars2020/multimedia/raw-images/) | Jezero context. Use Curiosity imagery for Gale. |
| **MOLA** | Mars Global Surveyor | Laser Altimeter DEM | 463 m/px | [PDS MOLA Record](https://pds-geosciences.wustl.edu/missions/mgs/mola.html) | Global elevation basemap, large-scale slope profiles. |
| **HiRISE** | Mars Reconnaissance Orbiter | Optical & Stereo DTM | 0.25 m/px optical, 1 m DTM | [HiRISE Ops Center](https://hirise.lpl.arizona.edu/) | Tactical boulder identification, crevasse avoidance, micro-slope mapping. |
| **CTX** | Mars Reconnaissance Orbiter | Panchromatic Optical | 6.0 m/px | [Caltech Murray CTX Mosaic](https://murray-lab.caltech.edu/CTX/) | Comprehensive regional visual basemap covering >99% of Mars. |
| **THEMIS** | 2001 Mars Odyssey | Thermal infrared and apparent thermal inertia | About 100 m/px | [USGS thermal inertia mosaic](https://astrogeology.usgs.gov/search/map/mars-themis-derived-global-thermal-inertia-mosaic) | Context for interpreting surface materials. |
| **CRISM** | Mars Reconnaissance Orbiter | Hyperspectral Imaging | 18–36 m/px | [JHU/APL CRISM](https://crism.jhuapl.edu/) | Mineralogical targets (clays, sulfates) for astronaut sampling. |
| **REMS / MEDA** | Curiosity & Perseverance | Surface Weather Sensors | In-situ point telemetry | [PDS Atmospheres](https://pds-atmospheres.nmsu.edu/) | Ground truth for atmospheric density, diurnal temperatures, dust tau. |
| **RAD** | Curiosity Rover | Energetic particle detector | In-situ point telemetry | [PDS RAD archive](https://pds-ppi.igpp.ucla.edu/mission/Mars_Science_Laboratory) | Historical radiation measurements at the rover. |
| **RIMFAX** | Perseverance Rover | Ground-penetrating radar | Along the rover track | [PDS RIMFAX archive](https://pds-geosciences.wustl.edu/missions/mars2020/rimfax.htm) | Shallow subsurface stratigraphy at Jezero. |

---

## 4. Operational Marswalk (EVA) Simulation Scenario

The proposed demo is a simulated out-and-back walk at Bagnold Dunes, Gale Crater.

1. Add a historical Curiosity reference line between High Dune and Namib Dune. Pin the documented observation and sampling locations.
2. Compare a direct route with a detour around the Namib slip face. Derive the slope and elevation profile from the cropped USGS elevation model. Show gaps in terrain coverage.
3. Add a science stop at the dune margin to compare ripple patterns and inspect Gobabeb mineralogy.
4. Calculate a return margin from the modeled travel time and the first consumable to reach reserve. Set pace, slope limits, and reserves as simulation inputs.

[Route evidence and workflow](challenge-data-audit.md#recommended-demonstration)

---

## 5. Comprehensive Planetary Systems Deep-Dive Matrix

For detailed scientific derivations, see the full guide: [`research/martian-systems-deep-dive.md`](martian-systems-deep-dive.md).

| System / Topic | Core NASA Finding | Mission / Instrument | Survival & Mission Integration |
| :--- | :--- | :--- | :--- |
| **Atmospheric Gas Pressures** | SAM measures composition and REMS measures local pressure. | Curiosity SAM and REMS | Use local pressure and state the time basis of the gas fractions. |
| **Wind** | The Namib daytime wind varied with dune position. | Curiosity REMS and MarsWRF | Use dated wind observations and show data gaps. |
| **Diurnal Thermal Cycling** | Air and ground temperatures vary during the sol. | Odyssey THEMIS and Curiosity REMS | Use separate observed temperature series. |
| **Seismology & Interior** | InSight recorded a historical seismic catalog from Elysium Planitia. | InSight SEIS | Use as regional science context. |
| **Radiation & Space Weather** | RAD recorded the May 2024 event. MAVEN provides historical orbital particle data. | Curiosity RAD and MAVEN SEP | Show a dated replay and the source measurement units. |
| **Hydrology & Subsurface Ice** | SWIM tracks orbital evidence for subsurface ice across broad regions. | SWIM and MRO SHARAD | Use as regional context for resource exploration. |
| **ISRU Oxygen & Propellant** | MOXIE produced 122 g total oxygen and reached 12 g/h. | Perseverance MOXIE | Demonstrates a process for future oxygen production. |
| **0.38g Gravity Adaptation** | Mars gravity is about 3.71 m/s². Sustained human outcomes remain uncertain. | NASA partial-gravity research | Model walking pace and fatigue as assumptions. |
| **Sol Temporal Tracking & Isolation** | A mean sol is 24 h 39 min 35.244 s. Mars500 provides Earth-based isolation data. | NASA Mars24 and Mars500 | Show UTC, mission sol, and local Mars time where available. |

---

## 6. Verified NASA References & Citations

> [!NOTE]
> For the comprehensive master directory of all datasets, planetary nodes, and research papers, consult: **[`sources-and-citations.md`](sources-and-citations.md)**.

1. **NASA Jet Propulsion Laboratory:** Mars Exploration Program & Rover Science Archives. [https://mars.nasa.gov](https://mars.nasa.gov)
2. **NASA Planetary Data System (PDS):** Geosciences and Atmospheres Nodes. [https://pds.nasa.gov](https://pds.nasa.gov)
3. **NASA Langley Research Center:** Mars Global Reference Atmospheric Model (Mars-GRAM). [https://software.nasa.gov/software/MFS-33157-1](https://software.nasa.gov/software/MFS-33157-1)
4. **USGS Astrogeology Science Center:** Planetary Geologic Mapping and Digital Elevation Models. [https://astrogeology.usgs.gov](https://astrogeology.usgs.gov)
5. **Hassler, D. M., et al. (2014):** *Mars' Surface Radiation Environment Measured with the Mars Science Laboratory's Curiosity Rover.* Science 343, 1244797. [DOI: 10.1126/science.1244797](https://doi.org/10.1126/science.1244797)
6. **Hecht, M. H., et al. (2009):** *Detection of Perchlorate by the Mars Phoenix Lander and Implications for Habitability.* Science 325, 64–67. [DOI: 10.1126/science.1172466](https://doi.org/10.1126/science.1172466)
7. **Banerdt, W. B., et al. (2020):** *Initial results from the InSight mission on Mars.* Nature Geoscience 13, 183–189. [DOI: 10.1038/s41561-020-0544-y](https://doi.org/10.1038/s41561-020-0544-y)
8. **Hecht, M. H., et al. (2021):** *Mars Oxygen ISRU Experiment (MOXIE)—Preparing for human Mars exploration.* Space Science Reviews 217, 9. [DOI: 10.1007/s11214-020-00782-8](https://doi.org/10.1007/s11214-020-00782-8)

