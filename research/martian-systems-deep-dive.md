# Comprehensive Martian Systems Deep-Dive: Science, Planetary Data & Survival Engineering
## NASA Space Apps Challenge 2026: Interplanetary Survival Guide — Martian Map

Use the [challenge data audit](challenge-data-audit.md) for the demo scope and source products.

---

## Table of Contents
1. [Atmospheric & Meteorological Systems](#1-atmospheric--meteorological-systems)
   * Atmospheric Composition & Gas Partial Pressures
   * Scale Height & Pressure Profile
   * Weather Patterns, Boundary Layer Dynamics & Katabatic Winds
   * Dust Storm Dynamics & Optical Depth ($\tau$)
   * Diurnal and Seasonal Temperature Regimes
2. [Topographic, Geophysical & Seismic Systems](#2-topographic-geophysical--seismic-systems)
   * Planetary Topography & The MOLA Areoid Datum
   * Elevation, Slope & Contour Modeling
   * Planetary Geophysics & InSight Seismic Data (SEIS)
   * Crustal Structure, Mantle & Core Dynamics
3. [Geological, Chemical & Regolith Systems](#3-geological-chemical--regolith-systems)
   * Mineralogical Stratigraphy & Aqueous History
   * In-Situ Geochemical Sensor Suites (APXS, ChemCam/SuperCam, PIXL)
   * Regolith Mechanics, Grain Morphology & Electrostatic Adhesion
   * Toxic Soil Chemistry: Perchlorates ($\text{ClO}_4^-$) & Oxidants
4. [Radiation Physics, Space Weather & Early Warning](#4-radiation-physics-space-weather--early-warning)
   * Galactic Cosmic Rays (GCR) & Curiosity RAD Baseline Data
   * Solar Particle Events (SPE) & Coronal Mass Ejections (CMEs)
   * Historical Mars solar particle events and alert modeling
5. [Hydrological Systems & In-Situ Resource Utilization (ISRU)](#5-hydrological-systems--in-situ-resource-utilization-isru)
   * Subsurface Glacial Ice Deposits (SHARAD, MARSIS, Phoenix)
   * Hydrated Mineral Reservoirs (Sulfates & Phyllosilicates)
   * Recurring Slope Lineae (RSL) Dynamics
   * ISRU Oxygen Extraction: MOXIE Solid Oxide Electrolysis (SOXE)
   * ISRU Fuel & Water Synthesis: Sabatier & Reverse Water-Gas Shift
6. [Navigation, Spatial Computing & Multi-Layered Mapping](#6-navigation-spatial-computing--multi-layered-mapping)
   * Geodetic Coordinate Systems & IAU 2000 Mars Ellipsoid
   * Multi-Layer Sensor Fusion (Optical, DEM, Thermal, Mineral, Weather)
   * Web GIS Architecture & OGC WMTS Standards
   * Ground-Level Point-of-View (POV) Image Correlation
7. [Tactical Route Planning & Hazard Avoidance Algorithms](#7-tactical-route-planning--hazard-avoidance-algorithms)
   * Cost Surface Impedance Modeling
   * Slope, terrain hazards, and coverage
   * Return margin and consumable budgets
8. [Human Physiological, Life Support & Psychological Factors](#8-human-physiological-life-support--psychological-factors)
   * Closed-Loop Environmental Control & Life Support Systems (ECLSS)
   * Spacesuit Ergonomics & Metabolic Burn Rates
   * Gravitational Adaptation to 0.38g & Neurovestibular Shifts
   * Temporal Systems: Sol Tracking & Circadian Synchronization
   * Psychological Isolation & Communication Latency Management
9. [Authoritative NASA References & Mission Archives](#9-authoritative-nasa-references--mission-archives)

---

## 1. Atmospheric & Meteorological Systems

### 1.1 Atmospheric Composition & Gas Partial Pressures
Mean Martian surface pressure is about 610 Pa. Pressure varies with location and season. The [Gale SAM results](https://doi.org/10.1029/2019JE006175) give annual mean volume fractions of 95.1% CO₂, 2.59% N₂, 1.94% ⁴⁰Ar, 0.161% O₂, and 0.058% CO. For a partial-pressure estimate, multiply the measured local total pressure by the gas volume fraction and state the time basis of each input.

### 1.2 Atmospheric Scale Height & Vertical Pressure Profiles
Mars has an atmospheric scale height ($H$) of approximately **$11.1\text{ km}$**, compared to Earth's $8.5\text{ km}$. This occurs because Mars has significantly lower surface gravity ($g = 3.72\text{ m/s}^2$) which counteracts the lower atmospheric mean temperature ($T \approx 210\text{ K}$):

$$H = \frac{k_B T}{m g} \approx \frac{R_{\text{specific}} T}{g} \approx \frac{(188.92\text{ J/(kg}\cdot\text{K)})(210\text{ K})}{3.72\text{ m/s}^2} \approx 10,660\text{ m} \approx 11.1\text{ km}$$

Atmospheric pressure $P(z)$ at altitude $z$ relative to the datum follows the barometric formula:

$$P(z) = P_0 \exp\left(-\frac{z}{H}\right)$$

* At the summit of **Olympus Mons** ($z \approx +21.9\text{ km}$): $P \approx 72\text{ Pa}$ ($0.72\text{ hPa}$).
* At the floor of **Hellas Planitia** ($z \approx -8.2\text{ km}$): $P \approx 1,155\text{ Pa}$ ($11.55\text{ hPa}$).
* **$\text{CO}_2$ Polar Condensation Cycle:** Because surface temperatures at the winter poles drop below the condensation point of carbon dioxide ($148\text{ K} / -125^\circ\text{C}$ at $6\text{ hPa}$), between **$25\%$ and $30\%$ of the entire planetary atmospheric mass** alternately condenses into polar dry ice caps and sublimates back each year. This produces a measurable global semi-annual barometric pressure fluctuation of $\pm 25\%$.

### 1.3 Weather Patterns, Boundary Layer Dynamics & Katabatic Winds
Martian weather is driven by intense solar heating of the low-density surface, radiative cooling, and massive topography:
* **Planetary Boundary Layer (PBL):** Due to the low atmospheric density, the daytime convective boundary layer expands rapidly to heights of 6 to 10 km above the surface, collapsing to less than 100 meters at night under strong thermal inversion.
* **Slope-drainage winds.** At the Namib lee site, the dune blocked northerly winds and daytime flow was primarily westerly during the sampled intervals. Keep the measurements and MarsWRF model outputs distinct. [Bagnold wind study](https://ntrs.nasa.gov/citations/20180000151)
* **Dynamic Aerodynamic Pressure:** Because Martian atmospheric density is only $\approx 0.020\text{ kg/m}^3$ (compared to Earth's $1.225\text{ kg/m}^3$, a ratio of 1:60), the physical dynamic force exerted by wind ($q = \frac{1}{2} \rho v^2$) is vastly lower. A Martian gale of $30\text{ m/s}$ feels like a light breeze of $3.8\text{ m/s}$ ($14\text{ km/h}$) on Earth. However, high-velocity winds carry fine saltating sand particles that cause significant abrasive wear on suit visors, mechanical seals, and solar coatings.

### 1.4 Dust Storm Dynamics & Optical Depth ($\tau$)
* **Convective Dust Devils:** Vertical convective vortices generated by strong solar surface heating. Diameters range from 10 meters to over 1 kilometer, reaching vertical heights of 8 kilometers. They travel at 5 to 20 m/s and generate substantial internal electrostatic fields.
* **Local and Regional Dust Storms:** Triggered primarily during southern hemisphere spring and summer when Mars is near perihelion and receives $\approx 45\%$ more solar radiation than at aphelion.
* **Global Planet-Encircling Dust Events (GDE):** Observed periodically (e.g., 1971, 1977, 2001, 2007, 2018). Suspended atmospheric dust blocks incoming solar radiation.
* **Measurement via Dust Optical Depth ($\tau$ / Tau):**
  * *Clear Sky:* $\tau \approx 0.3\text{ to }0.7$ (Direct solar transmission: $e^{-\tau} \approx 74\%\text{ to }50\%$).
  * *Moderate Regional Dust Event:* $\tau \approx 1.5\text{ to }2.5$ ($e^{-\tau} \approx 22\%\text{ to }8\%$).
  * *Global Dust Event:* $\tau \ge 4.5\text{ to }8.0+$ ($e^{-\tau} < 1\%$). Surface conditions transition into total daytime twilight, eliminating solar power production and reducing visibility to tens of meters.

### 1.5 Diurnal and Seasonal Temperature Regimes
Because of Mars' dry regolith, thin atmosphere, and low thermal inertia:
* **Equatorial Diurnal Extremes:** Midday ground surface temperatures reach $+20^\circ\text{C}$ to $+25^\circ\text{C}$ ($293\text{--}298\text{ K}$), then drop precipitously post-sunset to $-80^\circ\text{C}$ to $-90^\circ\text{C}$ ($183\text{--}193\text{ K}$) right before dawn.
* **Polar Winter Extremes:** Plunge to $-140^\circ\text{C}$ ($133\text{ K}$), freezing atmospheric $\text{CO}_2$ directly onto the ground.
* **Air and ground temperature.** Plot both REMS temperature series separately. [Gale energy budget](https://doi.org/10.1029/2020JE006804)
* **Engineering Impact:** Extreme thermal cycling causes thermal expansion fatigue in mechanical joints, cracks silicone spacesuit gaskets, degrades lithium-ion battery capacity by up to $60\%$ when unheated, and requires active closed-loop Liquid Cooling and Ventilation Garments (LCVG).

---

## 2. Topographic, Geophysical & Seismic Systems

### 2.1 Planetary Topography & The MOLA Areoid Datum
* **MOLA reference.** The areoid is a gravitational equipotential surface with a mean equatorial radius of 3,396,000 m. The MOLA topography product subtracts the local areoid radius from the measured planetary radius. Check the vertical datum of every other product before comparing elevations. [MOLA product specification](https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/document/egdrsis.pdf)
* **Total Global Elevation Range:** **$30.1\text{ kilometers}$**, spanning from $-8,200\text{ meters}$ in the impact basin of Hellas Planitia to $+21,900\text{ meters}$ at the volcanic peak of Olympus Mons.
* **Crustal Dichotomy:** A global topographic and geological asymmetry between the ancient, heavily cratered Southern Highlands (1 to 3 km above datum) and the younger, flat, low-lying Northern Lowlands (3 to 5 km below datum).

### 2.2 Elevation, Slope & Contour Modeling
Digital Elevation Models (DEMs) are derived from two primary NASA tiers:
1. **Macro-Topography (MOLA MEGDR):** 128 pixels per degree ($\approx 463\text{ m/pixel}$ at equator). Suitable for regional route planning, macro-catchment modeling, and broad line-of-sight analysis.
2. **Micro-Topography (HiRISE Stereo DTMs):** $1.0\text{ meter/pixel}$ horizontal grid spacing with relative vertical precision of $0.2\text{ to }0.3\text{ meters}$. Essential for tactical human traversal, resolving meter-scale boulders, small impact craters, and local slope steps.

Show slope in degrees. Set a simulation limit for the selected traveler and equipment. Interpret slope direction, loose surface material, and coverage before drawing a detour. Flag unmeasured terrain as unknown. [USGS terrain-model guidance](https://stac.astrogeology.usgs.gov/docs/data/mars/hirise_dtms/)

### 2.3 Planetary Geophysics & InSight Seismic Data (SEIS)
NASA’s **InSight Lander** (Interior Exploration using Seismic Investigations, Geodesy and Heat Transport), operating on Elysium Planitia from 2018 to 2022, deployed the **SEIS (Seismic Experiment for Interior Structure)** seismometer to record the first comprehensive geophysical profile of Mars:
* **Recorded Seismicity:** Detected **over 1,318 distinct marsquakes**, ranging in magnitude up to $M_w = 4.7$ (recorded on May 4, 2022, S1222a).
* **Seismic Sources:** Active tectonic faulting concentrated in the Cerberus Fossae graben system, thermal stress fracturing, and hypervelocity meteoroid impacts (such as the December 24, 2021 impact that produced an 150-meter crater and detected surface acoustic waves).
* **Very Low Seismic Attenuation (High Q Factor):** The dry, highly fractured, cold Martian crust does not attenuate seismic waves rapidly. Marsquakes ring and reverberate for up to **60 to 90 minutes**, compared to a few minutes on Earth.

### 2.4 Internal Structure & Crustal Boundaries
From InSight SEIS data:
* **Crustal Thickness:** The crust is divided into two or three layers, with an average thickness of **$24\text{ to }72\text{ km}$** ($39\pm 8\text{ km}$ under the InSight landing site).
* **Mantle:** Extends down to $\approx 1,560\text{ km}$, dominated by olivine and pyroxene with an enriched iron content relative to Earth.
* **Core.** An early estimate gave a radius of about 1,830 km. A later model with a molten silicate layer above the metal core estimated 1,675 ± 30 km. [InSight interior analysis](https://doi.org/10.1038/s41586-023-06586-4)
* **Project use.** The single-station InSight catalog supports regional context. Foundation and subsurface assessment need local measurements. [Marsquake Service V14](https://www.insight.ethz.ch/en/seismicity/catalog/v14/)

---

## 3. Geological, Chemical & Regolith Systems

### 3.1 Mineralogical Stratigraphy & Aqueous History
Martian geologic history is categorized into three major chronological eras, mapped directly through orbital spectrometers (CRISM, OMEGA) and rover instruments:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MARTIAN GEOLOGICAL ERA STRATIGRAPHY                  │
├─────────────────┬───────────────────┬──────────────────────────────────┤
│ Era / Epoch     │ Age Span          │ Dominant Mineralogy & Climate    │
├─────────────────┼───────────────────┼──────────────────────────────────┤
│ Noachian        │ 4.1 – 3.7 Ga ago  │ Phyllosilicates (Clays):          │
│                 │                   │ Smectite, Nontronite, Kaolinite. │
│                 │                   │ Neutral/alkaline water, lakes.   │
├─────────────────┼───────────────────┼──────────────────────────────────┤
│ Hesperian       │ 3.7 – 3.0 Ga ago  │ Hydrated Sulfates: Jarosite,     │
│                 │                   │ Gypsum, Kieserite, Hematite.     │
│                 │                   │ Acidic water, evaporite basins.  │
├─────────────────┼───────────────────┼──────────────────────────────────┤
│ Amazonian       │ 3.0 Ga to present │ Anhydrous Ferric Oxides (Fe₂O₃), │
│                 │                   │ Nanophase hematite, Perchlorates.│
│                 │                   │ Hyper-arid, cold desert, active  │
│                 │                   │ photochemical oxidation.         │
└─────────────────┴───────────────────┴──────────────────────────────────┘
```

### 3.2 In-Situ Geochemical Sensor Suites
* **APXS (Alpha Particle X-Ray Spectrometer):** Flown on Sojourner, Spirit, Opportunity, and Curiosity. Employs Curium-244 ($^{244}\text{Cm}$) to bombard rock/soil targets with alpha particles and X-rays, measuring bulk elemental concentrations from sodium ($Na$) to bromine ($Br$).
* **ChemCam & SuperCam:** Laser-Induced Breakdown Spectroscopy (LIBS) on Curiosity and Perseverance. Pulses an infrared laser ($1064\text{ nm}$) to vaporize rock targets up to 7 meters away, generating an expanding plasma analyzed by spectrometers for elemental composition.
* **PIXL (Planetary Instrument for X-ray Lithochemistry):** Arm-mounted micro-focus X-ray fluorescence spectrometer on Perseverance, mapping elemental chemistry at a sub-millimeter scale ($100\text{ }\mu\text{m}$ beam spot).
* **SHERLOC (Scanning Habitable Environments with Raman & Luminescence for Organics and Chemicals):** Deep UV laser ($248.6\text{ nm}$) native fluorescence and resonance Raman spectrometer resolving organic molecules and aromatic minerals.

### 3.3 Regolith Mechanics, Grain Morphology & Electrostatic Hazards
* **Grain Size:** Basaltic sand, fragmented volcanic glass, and extremely fine dust particles with median diameters of **$2.0\text{ to }5.0\text{ }\mu\text{m}$**.
* **Grain Morphology:** Unlike Earth sand which is tumbled and smoothed by ocean waves and river flows, Martian regolith grains are mechanically crushed by impacts and saltation in dry air. They remain **angular, jagged, and abrasive**, acting as microscopic cutting blades against spacesuit fabric weaves, glove joints, and airlock pressure seals.
* **Triboelectric Charging:** The dry, low-pressure $\text{CO}_2$ atmosphere promotes severe triboelectric charging when dust particles rub against suit materials, tires, or other dust grains. Regolith carries strong static charges, adhering tenaciously to suit visors, camera optics, solar arrays, and suit cloth.

### 3.4 Toxic Soil Chemistry: Perchlorates ($\text{ClO}_4^-$) & Reactive Oxidants
The Phoenix Wet Chemistry Laboratory measured 0.4–0.6% perchlorate by mass in sampled soils. Soil chemistry varies by site. Use local measurements for any mapped concentration. [Phoenix soil analysis](https://doi.org/10.1126/science.1172466)

---

## 4. Radiation Physics, Space Weather & Early Warning

Curiosity measures the surface radiation environment at its location. The early Gale interval gave a GCR-dominated dose equivalent rate of 0.64 ± 0.12 mSv/day. A later solar-minimum study measured 0.721 ± 0.042 mSv/day. The difference depends on solar activity and atmospheric conditions. [Early RAD results](https://doi.org/10.1126/science.1244797) · [Solar-minimum analysis](https://www.sciencedirect.com/science/article/am/pii/S0019103522001488)

### 4.1 Galactic cosmic rays and Curiosity RAD

Galactic cosmic rays contribute a persistent background. For a comparison, keep the dose quantity, units, detector, and interval with each record. [PDS RAD archive](https://pds-ppi.igpp.ucla.edu/mission/Mars_Science_Laboratory)

### 4.2 Solar particle events

JPL reported 8,100 µGy absorbed dose for the 20 May 2024 event at Curiosity. A human dose estimate needs a radiation quality and shielding model. Store absorbed dose in Gy and dose equivalent in Sv. [JPL event report](https://www.jpl.nasa.gov/news/nasa-watches-mars-light-up-during-epic-solar-storm/)

### 4.3 Space weather alerts

Use the May 2024 event as a dated replay. NASA declared MAVEN’s mission ended on 3 June 2026. Its archive provides historical orbital observations. NOAA GOES measurements describe near-Earth conditions. A Mars prediction needs a Mars-specific model and its uncertainty. [NASA MAVEN status](https://science.nasa.gov/mission/maven/) · [NASA SEPSTER3D model](https://ccmc.gsfc.nasa.gov/models/SEPSTER3D~0.1/) · [Event replay data](https://doi.org/10.5281/zenodo.14801849)

---

## 5. Hydrological Systems & In-Situ Resource Utilization (ISRU)

### 5.1 Subsurface Glacial Ice Deposits
While liquid water cannot stably persist on the surface due to the low atmospheric pressure ($6.1\text{ hPa}$) being right at water's triple point ($6.1165\text{ hPa}$, $0.01^\circ\text{C}$), massive deposits of subterranean water ice exist across Mars:
* **Radar Sounding (SHARAD & MARSIS):** The Shallow Radar (SHARAD) on MRO has discovered vast subsurface sheets of pure water ice in the mid-latitudes (**Arcadia Planitia**, **Utopia Planitia**, **Deuteronilus Mensae**). These ice sheets lie beneath $1\text{ to }10\text{ meters}$ of insulating regolith, measure up to $100\text{ meters}$ thick, and hold as much water as Lake Superior.
* **Phoenix Lander Direct Sampling:** In 2008, the Phoenix lander scraped a trench 5 cm deep at $68^\circ\text{N}$, uncovering bright white subsurface ice that sublimated into the atmosphere over several days.
* **Impact Exhumations:** Fresh meteoroid impacts regularly excavate pristine subsurface ice, confirmed by HiRISE multi-spectral imaging.

### 5.2 Hydrated Mineral Reservoirs
For equatorial human bases where glacial ice is too deep:
* **Phyllosilicates (Clays):** Smectites and chlorites contain **$2\%\text{ to }4\%$ chemically bound structural water ($H_2O / OH$)** within their crystal lattices.
* **Polyhydrated Sulfates:** Gypsum ($\text{CaSO}_4\cdot 2\text{H}_2\text{O}$) and epsomite ($\text{MgSO}_4\cdot 7\text{H}_2\text{O}$) contain **up to $8\%\text{ to }15\%$ water by weight**, extractable by heating crushed regolith to $300^\circ\text{C}\text{ to }500^\circ\text{C}$ inside an ISRU thermal reactor.

### 5.3 Recurring Slope Lineae (RSL)
Narrow (0.5 to 5 m wide), dark streaks that incrementally form and flow downslope on warm ($>250\text{ K}$) equators and crater walls during spring and summer, fading in autumn:
* **Scientific Debate:** Debated between shallow seeps of hypersaline liquid brines (containing calcium/magnesium perchlorate salts with eutectic temperatures down to $-70^\circ\text{C}$) and dry granular flows of dark sand triggered by seasonal thermal cycling.
* **Planetary Protection:** Designated as potential "Special Regions" under COSPAR planetary protection guidelines to prevent biological contamination by human microflora.

### 5.4 ISRU Oxygen Extraction: MOXIE Solid Oxide Electrolysis (SOXE)
NASA’s MOXIE experiment on Perseverance demonstrated oxygen production from the Martian atmosphere at Jezero Crater.
* **Thermodynamic Reaction:**

$$2\text{CO}_2 \xrightarrow{\Delta H, 800^\circ\text{C}} 2\text{CO} + \text{O}_2$$

* **Mechanism:** Air is drawn from the Martian atmosphere, compressed from $6\text{ hPa}$ to $1\text{ atm}$, heated to $800^\circ\text{C}$, and directed across Solid Oxide Electrolyzer cells (scandia-stabilized zirconia, YSZ). Oxygen ions ($\text{O}^{2-}$) diffuse through the ceramic electrolyte and recombine into pure molecular $\text{O}_2$ gas at the anode.
* **Results.** MOXIE produced 122 g of oxygen across 16 runs. The peak rate was 12 g/h at 98% purity or better. A crew-scale system would need separate design and testing. [JPL experiment results](https://www.jpl.nasa.gov/news/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/)

### 5.5 ISRU Fuel & Propellant Synthesis: The Sabatier Reaction
Liquid methane ($\text{CH}_4$) combined with liquid oxygen ($\text{LOX}$) is the premier propellant combination for Mars Ascent Vehicles (MAV):
* **Sabatier Methanation:**

$$\text{CO}_2 + 4\text{H}_2 \xrightarrow{\text{Ru-Al}_2\text{O}_3, 400^\circ\text{C}} \text{CH}_4 + 2\text{H}_2\text{O} \quad (\Delta H = -165\text{ kJ/mol})$$

* Water produced by the reaction is electrolyzed into hydrogen (recycled back to the Sabatier reactor) and oxygen (liquefied and cryo-stored for propellant oxidizer and life support).

---

## 6. Navigation, Spatial Computing & Multi-Layered Mapping

### 6.1 Geodetic Coordinate Systems & The IAU 2000 Mars Ellipsoid
* **Reference Spheroid:** Defined by the International Astronomical Union (IAU) Working Group on Cartographic Coordinates and Rotational Elements (IAU 2000):
  * Equatorial Radius ($a$): $3,396,190\text{ meters}$.
  * Polar Radius ($b$): $3,376,200\text{ meters}$.
  * Flattening ($f = \frac{a - b}{a}$): $0.005886$.
* **Coordinate Standards:** East-positive planetocentric longitudes ($0^\circ\text{ to }360^\circ$ East), measured from the Martian Prime Meridian passing through the small crater **Airy-0** inside the larger crater Airy in Sinus Meridiani.
* **Projections:**
  * Global/Equatorial: Equirectangular (Plate Carrée) and Mercator.
  * Local traversal zones use a metric Mars projection with the appropriate planetary radii and coordinate convention.
  * Polar Mapping: Polar Stereographic.

### 6.2 Multi-Layer Sensor Fusion Schema
To create a truly operational map for surface survival, our architecture layers multiple distinct planetary datasets:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MARS MULTI-LAYER MAP SCHEMA                          │
├─────────┬──────────────────────┬─────────────┬─────────────────────────┤
│ Layer   │ Data Source          │ Resolution  │ Tactical Mission Role   │
├─────────┼──────────────────────┼─────────────┼─────────────────────────┤
│ Base 1  │ MRO CTX Mosaic       │ 6.0 m/px    │ Continuous visual base  │
│ Base 2  │ MRO HiRISE Ortho     │ 0.25 m/px   │ Tactical boulder/crevasse│
│ Layer 3 │ MGS MOLA DEM         │ 463 m/px    │ Regional elevation grid │
│ Layer 4 │ HiRISE Stereo DTM    │ 1.0 m/px    │ Micro-slope & roughness │
│ Layer 5 │ Odyssey THEMIS Night │ 100 m/px    │ Thermal inertia/traffic │
│ Layer 6 │ MRO CRISM Spectra    │ 18-36 m/px  │ Clay/sulfate science POI│
│ Layer 7 │ MSL/M2020 Telemetry  │ In-Situ     │ Microclimate & radiation│
└─────────┴──────────────────────┴─────────────┴─────────────────────────┘
```

### 6.3 Web GIS Standards (OGC WMTS) & JPL Mars Trek
* **Tile Protocol:** Integration with Open Geospatial Consortium (OGC) Web Map Tile Services (WMTS). Mars Trek streams pre-rendered multi-resolution map tiles structured along standard quadtree pyramid zoom levels ($z=0$ to $z=18$).
* **Client Architecture:** WebGL/WebGPU 3D map canvases (CesiumJS, MapLibre GL, Leaflet) allowing dynamic layer blending, real-time elevation shading, and contour line rendering directly in browser environments.

---

## 7. Tactical Route Planning & Hazard Avoidance Algorithms

### 7.1 Cost Surface Impedance Modeling
Build the route cost from segment length, uphill and cross-slope, and explicitly mapped terrain hazards. Use dated images to trace mobile sand. Use THEMIS apparent thermal inertia as context for surface materials. Keep missing or low-quality terrain visible. Use radiation and weather point records for dated context, with a separate model if the demo estimates conditions between measurements. [Bagnold Dunes data and route checks](challenge-data-audit.md#checks-before-using-the-data-in-the-prototype)

### 7.2 Route comparison and return margin
Compare the direct route with a modeled detour. Use a declared walking speed and stop times. For each consumable, compare the remaining amount with its modeled return need plus reserve. Show the first resource that reaches its reserve. Record the reserve as a configurable scenario input.

---

## 8. Human Physiological, Life Support & Psychological Factors

### 8.1 Closed-Loop Environmental Control & Life Support (ECLSS)
Use oxygen storage, carbon dioxide removal, battery energy, cooling water and reserve as separate suit inputs. NASA’s baseline values provide context for the input assumptions. ISS hardware demonstrated 98% water recovery with brine processing. Use the ISS figure as habitat life-support context. [NASA life-support baseline values](https://ntrs.nasa.gov/citations/20210024855) · [ISS test](https://www.nasa.gov/missions/station/nasa-achieves-water-recovery-milestone-on-international-space-station/)

### 8.2 Gravitational Adaptation to 0.38g

Mars surface gravity is about 3.71 m/s². A traveler and suit retain their mass and inertia in the lower gravity. Sustained human adaptation at 0.38 g remains uncertain. Treat pace, stability and fatigue as simulation assumptions. [Mars facts](https://www.jpl.nasa.gov/news/press_kits/insight/landing/facts/mars-at-a-glance/) · [NASA partial-gravity research](https://ntrs.nasa.gov/citations/20205010170)

### 8.3 Temporal Systems: Sol Tracking & Circadian Desynchronization
* **The Martian Sol:** Measures **24 hours, 39 minutes, 35.244 seconds** (39.5 minutes longer than an Earth solar day).
* **Circadian Clock Drift:** While humans can adjust to a 24.65-hour circadian cycle, the human suprachiasmatic nucleus (SCN) requires precise environmental synchronization cues. Without dynamic high-lux blue-enriched lighting (460–480 nm) in the morning and red lighting before sleep, crew members suffer cumulative sleep latency, insomnia, and cognitive degradation.
* **Timestamps.** Preserve UTC and mission sol. Label local mean or true solar time and retain the convention used by the source. [NASA Mars24 technical notes](https://www.giss.nasa.gov/tools/mars24/help/notes.html)

### 8.4 Psychological Isolation & Communication Latency Management
* **Latency Dynamic:** The orbital geometry between Earth and Mars dictates a one-way radio propagation delay ranging from **$3.1\text{ minutes}$** (at closest perihelic opposition, ~56 million km) to **$22.3\text{ minutes}$** (at superior conjunction, ~401 million km).
* **Round-Trip Delay:** **$6.2\text{ to }44.6\text{ minutes}$**.
* **Total Autonomy Mandate:** In an emergency (suit pressure drop, rover battery failure, severe dust devil encounter), Mission Control on Earth cannot intervene in real time. The on-suit/on-rover navigation interface must provide completely automated diagnostic feedback, route recalculation, and emergency abort guidance without requiring remote confirmation from Earth.

---

## 9. Authoritative NASA References & Mission Archives

> [!NOTE]
> For the complete, unabridged catalog of all mission archives, dataset repositories, PDS nodes, and research papers, see the master directory: **[`research/sources-and-citations.md`](sources-and-citations.md)**.

1. **NASA Jet Propulsion Laboratory (JPL) Mars Trek Portal:**  
   [https://trek.nasa.gov/mars/](https://trek.nasa.gov/mars/)
2. **USGS Astrogeology Planetary Geologic Mapping Program:**  
   [https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars](https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars)
3. **NASA Science MSL Curiosity Route up Mount Sharp:**  
   [https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/](https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/)
4. **NASA Worldview Earthdata Satellite Browser:**  
   [https://worldview.earthdata.nasa.gov/](https://worldview.earthdata.nasa.gov/)
5. **Mars 2020 Perseverance Raw Images Gallery:**  
   [https://mars.nasa.gov/mars2020/multimedia/raw-images/](https://mars.nasa.gov/mars2020/multimedia/raw-images/)
6. **NASA Planetary Data System (PDS) Geosciences Node (MOLA, CRISM, THEMIS, RIMFAX, SHARAD, InSight SEIS):**  
   [https://pds-geosciences.wustl.edu/](https://pds-geosciences.wustl.edu/)
7. **NASA PDS Atmospheres Node (REMS, MEDA, RAD, Mars Weather Data):**  
   [https://pds-atmospheres.nmsu.edu/](https://pds-atmospheres.nmsu.edu/)
8. **University of Arizona HiRISE High Resolution Imaging Operations Center & DTM Catalog:**  
   [https://hirise.lpl.arizona.edu/](https://hirise.lpl.arizona.edu/) | [https://www.uahirise.org/dtm/](https://www.uahirise.org/dtm/)
9. **Banerdt, W. B., et al. (2020):** *Initial results from the InSight mission on Mars.* Nature Geoscience 13, 183–189. [DOI: 10.1038/s41561-020-0544-y](https://doi.org/10.1038/s41561-020-0544-y)
10. **Hassler, D. M., et al. (2014):** *Mars' Surface Radiation Environment Measured with the Mars Science Laboratory's Curiosity Rover.* Science 343, 1244797. [DOI: 10.1126/science.1244797](https://doi.org/10.1126/science.1244797)
11. **Hecht, M. H., et al. (2021):** *Mars Oxygen ISRU Experiment (MOXIE)—Preparing for human Mars exploration.* Space Science Reviews 217, 9. [DOI: 10.1007/s11214-020-00782-8](https://doi.org/10.1007/s11214-020-00782-8)
12. **Hecht, M. H., et al. (2009):** *Detection of Perchlorate by the Mars Phoenix Lander and Implications for Habitability.* Science 325, 64–67. [DOI: 10.1126/science.1172466](https://doi.org/10.1126/science.1172466)
13. **NASA Human Research Program (HRP):** *Evidence Report: Risk of Acute and Late Central Nervous System Effects from Radiation Exposure.* [NASA Space Radiation Program](https://www.nasa.gov/directorates/esdmd/human-research-program/space-radiation/)
14. **NASA Technical Reports Server (NTRS) - Sabatier ISRU System Design:** [https://ntrs.nasa.gov/citations/20120016419](https://ntrs.nasa.gov/citations/20120016419)
15. **NOAA Space Weather Prediction Center (SWPC):** [https://www.swpc.noaa.gov/](https://www.swpc.noaa.gov/)
16. **NASA GISS Mars24 Sunclock & Time Algorithm (MSD/MTC):** [https://www.giss.nasa.gov/tools/mars24/](https://www.giss.nasa.gov/tools/mars24/)

