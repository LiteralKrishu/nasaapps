# Namib Dune Marswalk

Open [index.html](index.html) in a browser. The page runs offline. Select either route to update the elevation profile. Move over the chart or use its slider to locate a sample on the map. Use the controls to compare imagery, 2 m contours, slope, the dune exclusion zone, and Curiosity’s historical track.

| Outbound leg | Distance | Ascent | Peak grade | Distance inside the traced dune zone |
| --- | ---: | ---: | ---: | ---: |
| Simulated detour | 129.36 m | 2.60 m | 13.34° | 0 m |
| Direct comparison | 91.93 m | 3.55 m | 21.27° | 44.46 m |

The detour adds 37.43 m and has about 8 m of clearance on the routing grid. The start and observation stop are simulated. The Gobabeb marker identifies the approximate rover work area from the last PLACES position on sol 1221. The sample was collected on sol 1225. The historical track shows interpolated rover positions from sols 1185–1244. [Bagnold field map, figure 2](https://doi.org/10.1002/2017JE005267) · [Gobabeb sample chronology](https://ntrs.nasa.gov/api/citations/20205001822/downloads/Rampe_etal_2020_Geochemistry_Mineral_Geochem_in_Gale_after_6_yrs.pdf)

## Sources and alignment

| Input | Local file and processing |
| --- | --- |
| [USGS Gale DEM v3](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m) | [Elevation GeoTIFF](data/elevation.tif), 1 m grid. The original mosaic is tied to MOLA and assembled from terrain products of different native resolutions. |
| [USGS Gale orthophoto v3](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm) | [Orthophoto GeoTIFF](data/orthophoto.tif), 0.25 m grid. The map renders a tinted copy of the grayscale source. |
| [JPL Curiosity PLACES](https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/) | `localized_interp.csv` supplies the archived easting, northing, elevation, and mission sol. The cropped track is bundled in `data/survey.js`. |
| [NASA Photojournal PIA20281](https://science.nasa.gov/photojournal/slip-face-on-downwind-side-of-namib-sand-dune-on-mars/) | The panel shows Curiosity’s view of the Namib slip face. |

Both rasters share a north-up Mars equirectangular projection (ESRI:103885) and the same projected bounds, from 8,142,270 to 8,142,560 m east and −277,480 to −277,285 m north. The elevation mosaic was resampled onto a shared origin. The orthophoto already matched that origin. The elevation crop has full coverage. About 1.9% of the orthophoto is marked NoData near the western edge, outside the planned route. The mapped sand edge, terrain break and rover passes align visually with the published field map. At 518 archived rover fixes, the median absolute deviation between PLACES elevation and sampled DEM elevation was 0.11 m, with a 95th percentile of 0.39 m. PLACES elevations use an orbital terrain model, so these numbers show consistency between products. [PLACES specification](https://planetarydata.jpl.nasa.gov/w10n/msl/msl_places/document/PLACES_PDS_SIS.pdf)

## Route and profile method

The dune exclusion is traced from the dark sand boundary and the slip face on the ortho, using the campaign figure to identify the feature. The east edge of the exclusion continues beyond the map. The route search uses a 1 m terrain grid, a 7 m minimum modeled dune margin, a 20° terrain-inclination limit, and a cost penalty for steeper cells. It avoids cells without image coverage. These parameters define the simulated walk. Dune migration and surface conditions between source observations remain uncertain. Profiles sample the DEM every 0.5 m or closer by interpolation. Peak grade is measured along the route over an approximately 5 m baseline. Cumulative ascent uses a 1 m smoothing scale. [Elevation samples](data/profile.csv) · [Published observations of local dune change](https://doi.org/10.1002/2017JE005263)

## Return to base

The calculator uses the selected outbound distance in each direction. It divides that distance by each walking pace and adds time at the stop. Enter endurance and minimum reserves as Earth minutes at the expected workload for each resource. Available time above reserve is departure endurance minus reserve. The smallest such value sets the overall time limit. The calculator subtracts round-trip time to find the remaining margin and subtracts return travel time to find the latest departure from the stop. It reports each resource’s endurance at arrival and shows a terrain warning for the direct crossing.

The timeline shows outbound travel, science time, delay at the stop, and return travel. It marks when the first resource reaches reserve and identifies the phase if that happens during the trip. The time available at the stop is the time above reserve minus both travel legs. It includes science and any delay. The model uses the entered pace and constant resource use. The starting values are illustrative.

## Gobabeb science

The panel shows Curiosity’s views of Namib’s ripple crests and slip face. The CheMin table gives the major mineral shares of the crystalline part of the fine scoop. The APXS comparison uses measurements of separate fine and coarse discard piles. The THEMIS and Curiosity thermal estimates describe different footprints. [CheMin Table 1](https://doi.org/10.1002/2017JE005262) · [APXS Table 3](https://doi.org/10.1002/2017JE005267) · [Thermal data comparison](https://doi.org/10.1029/2021JE007076)

## Historical weather

The sol timeline covers the two in-field phases of the Bagnold Dunes campaign. Sols 1162–1254 cover High Dune, Namib, and nearby sampling activities. Sols 1602–1660 cover Nathan Bridges Dune and Mount Desert Island. The timeline compresses the interval between phases. Weather measurements apply to Curiosity’s location on the selected sol. [Campaign chronology](https://doi.org/10.1029/2018GL079032)

**Campaign overview** uses the public daily weather summaries published by NASA for outreach. These contain air and ground temperature ranges and pressure for 149 of the 152 campaign sols. **Within sol** uses bundled PDS4 calibrated REMS MODRDR tables for 30-minute local mean solar time (LMST) windows. The values table gives each mean and its accepted record count. The panel uses the daily summary if the associated 30-minute series is unavailable, and leaves missing windows blank. [NASA daily reports](data/rems-daily.csv) · [PDS window data](data/rems-weather.csv)

The bundle contains 83 calibrated tables, including all 60 sols on the Namib map’s historical track (1185–1244). It has usable weather on 151 campaign sols across both sources. No measurements pass the selected filters on sol 1612, and its daily report is blank. Phase 1 has accepted horizontal wind speeds on 72 sols.

The importer checks each table’s size, record count, units, time format, and quality flags. Air temperature requires good power, a reading within the operating range, and a reliable flag. Ground brightness temperature requires good power and recalibration, a stationary rover, and a view without shadow. Pressure accepts either oscillator and excludes shadow-affected records. Temperatures are converted from kelvin to Celsius.

The wind chart accepts archive estimates from a stationary rover with adequate sensor temperature, no flagged electronic noise, correct sensor configuration, wind from the front of the rover, and speeds from 0 to 20 m/s. The archive marks wind estimates as preliminary. The chart averages the accepted estimates per window or sol. The REMS wind boards failed before phase 2. [REMS product description](https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=MSL-M-REMS-5-MODRDR-V1.0) · [Bagnold wind study](https://doi.org/10.1016/j.icarus.2016.12.016)

To regenerate the weather files, place the original PDS `RMD` XML labels and their matching `.TAB` files in one directory. Save NASA’s daily weather JSON separately. From the project root, run `python3 scripts/build_rems_weather.py /path/to/products --daily /path/to/daily.json`. This command uses the Python standard library. [NASA PDS calibrated archive](https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_calibrated/) · [NASA daily weather JSON](https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json)

## Solar storm replay

The replay covers May 19–22, 2024 UTC. Curiosity recorded the event elsewhere in Gale Crater, years after the Bagnold campaign. Use the slider, playback controls, or RAD peak button to compare measurements from the surface and Mars orbit. Both charts use the same 30-minute windows. The shaded band marks May 20 UTC. [JPL event report](https://www.jpl.nasa.gov/news/nasa-watches-mars-light-up-during-epic-solar-storm/)

- **Curiosity RAD** uses Level 2 absorbed dose rate in tissue-equivalent plastic (Detector E, `Total Dose E`). The importer accepts unflagged records with positive dose rates and live time. The background is the median of 413 accepted observations from May 15–19 UTC. The highest single accepted observation reached 8,377.9 µGy/day at 06:15:19 UTC on May 20, about 59.3 times the 141.3 µGy/day background. The unit expresses a rate per 24 Earth hours. [NASA RAD archive](https://spdf.gsfc.nasa.gov/pub/data/aaa_planetary/msl/rad/cdf/obs-l2/2024/)
- **MAVEN SEP** uses Level 2 calibrated differential ion flux in the forward view of sensor 1. The selected channel has a center of 2,243 keV and a width of 609.6 keV. The importer selects valid times, nonnegative flux values, positive accumulation times, and an open attenuator. The replay uses this one instrument setting throughout. The spacecraft’s orbit, detector view, and attenuator affect coverage. [NASA MAVEN SEP archive](https://spdf.gsfc.nasa.gov/pub/data/maven/sep/l2/s1-cal-svy-full/2024/05/) · [SEP instrument and data guide](https://pds-ppi.igpp.ucla.edu/data/maven-sep-calibrated/document/maven_sis_SEP_v19.pdf)

The importer assigns observations to windows by source timestamp. Each mean uses RAD live time or MAVEN accumulation time as the weight. RAD has observations in all 192 windows. MAVEN has accepted observations in 178 windows. The other 14 MAVEN windows are blank. The CSV includes the sample counts, source filenames, and background value. [Download the replay CSV](data/solar-storm.csv)

Install `numpy` and `cdflib` to rebuild the replay. Download the daily CDFs listed in `scripts/build_storm_replay.py` and place them in one directory. Run `python3 scripts/build_storm_replay.py /path/to/products` from the project root.

## Water ice and resources

The **Regional ice & MOXIE** view uses the three SWIM4MIM composite GeoTIFFs for depths of 0–1 m, 1–5 m, and more than 5 m. The maps cover 60° S to 60° N. The original rasters have 20 pixels per degree, or about 3 km per cell at the equator. The offline images use nearest-neighbor sampling at 4 pixels per degree, over a Mars Trek MOLA basemap. [SWIM products](https://swim.psi.edu/SWIM4MIMProducts.php) · [Mars Trek tiles](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars)

Blue marks cells that meet the study’s ice-consistency thresholds of 0.30, 0.40, and 0.50 for the three depth intervals. Lighter blue indicates a higher score. Gray indicates a score below the threshold. Hatching indicates no mapped value. The site readout samples the original GeoTIFF cells at the marker coordinates. Arcadia and Utopia represent selected points in their respective plains. A score describes evidence consistent with buried ice. Establishing local ice concentration or extraction yield requires site measurements. [SWIM study](https://doi.org/10.3847/PSJ/ad9b24) · [Arcadia coordinates](https://planetarynames.wr.usgs.gov/Feature/348) · [Utopia coordinates](https://planetarynames.wr.usgs.gov/Feature/6260)

MOXIE tested solid-oxide electrolysis using atmospheric carbon dioxide at Jezero. The panel shows the measured production results and the instrument photograph. [NASA/JPL results](https://www.jpl.nasa.gov/news/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/) · [NASA Photojournal PIA24203](https://science.nasa.gov/photojournal/moxie-all-tucked-in/)

To regenerate the resource view, place the original SWIM GeoTIFFs, Mars Trek’s two level-zero color-hillshade JPEGs (`mola-0.jpg` and `mola-1.jpg` in west-to-east order), and NASA photo PIA24203 (`moxie.jpg`) in one directory. Run `python3 scripts/build_swim_resources.py /path/to/products` from the project root. The script uses Rasterio, NumPy, and Pillow.

## Water and ISRU

The DAN layer shows 20 active and 203 passive records whose centers fall in the Namib map. The derived archive gives each record a water-equivalent hydrogen (WEH) estimate and statistical uncertainty. It models the upper ~60 cm as a uniform layer and groups results into about 3 m cells along the rover path. The display projects the published coordinates into the same Mars grid as the terrain map. It displays centers and leaves areas between samples blank. The active sand record 4549.1 near Gobabeb has **0.78 ± 0.06 wt% WEH**. WEH measures hydrogen expressed as an equivalent mass of water. It can include hydrogen bound in minerals. The estimate gives no recovery yield. [DAN derived table](https://zenodo.org/records/6974535) · [DAN methods](https://doi.org/10.1029/2022JE007327) · [Gobabeb sand study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5815393/)

The regional view uses the SWIM4MIM composite GeoTIFFs. Each crop shows 61 × 49 original grid cells, each about 2.96 km wide at the equator. All three maps use the same color scale. The marker uses the coordinates of DAN record 4549.1 and the readout uses the original cell that contains that point. The ice-consistency scores for 0–1 m, 1–5 m, and below 5 m are +0.08646, +0.21429, and 0.00. All are below the study’s thresholds for high ice consistency (+0.30, +0.40, +0.50). The composites have valid cells at Namib in these three layers. NoData is a separate category. The 2023 NASA northern map covers 0–60° N, which excludes Gale. Later composites cover Gale, but orbital evidence near the equator remains inconclusive. [SWIM products](https://swim.psi.edu/SWIM4MIMProducts.php) · [Threshold study](https://doi.org/10.3847/PSJ/ad9b24) · [NASA 2023 map](https://science.nasa.gov/resource/swim-map-shows-subsurface-water-ice-on-mars/) · [Equatorial uncertainty study](https://doi.org/10.3847/PSJ/ae8904)

Install NumPy, Pillow, and Rasterio to rebuild the panel’s data and maps. Download the [DAN table](https://zenodo.org/records/6974535/files/DAN_Pixelization_Table_sol_3333.csv?download=1) and the three SWIM GeoTIFFs linked in the products list. Run `python3 scripts/build_water_isru.py /path/to/DAN_Pixelization_Table_sol_3333.csv /path/to/swim` from the project root.

## Marsquakes

The explorer uses the InSight Marsquake Service V14 catalog from NASA PDS. It includes all 1,323 events in the catalog’s low- and high-frequency families. The catalog identifies eight of these events as impacts. The explorer omits 1,392 separately classified super-high-frequency signals. The timeline uses the preferred origin time in UTC. It shows the preferred moment magnitude and its reported uncertainty for 672 events. Events without a magnitude have their own row. [NASA PDS collection](https://pds.nasa.gov/ds-view/pds/viewCollection.jsp?identifier=urn%3Anasa%3Apds%3Ainsight_seis%3Adata_derived) · [V14 catalog guide](https://www.seis-insight.eu/static/mqs-catalogs/v14/mars_seismic_catalogue_insight_v14_end_2023-01-01_release_2023-04-01.pdf)

The map plots 22 seismic epicenters and eight impact sites identified in orbital images. For impacts it uses the separate orbital location in the catalog. The catalog uses InSight’s lander coordinates as a placeholder for unresolved locations. The map displays those coordinates only for the lander. For events with distance alone, the map shows the range of possible distances from InSight as a band, or a line at the nominal distance if the record has no bounds. It computes the angular distances on a sphere and displays them in a north-up equirectangular projection. The plotted records give no numerical position bounds. The event card shows the catalog’s A–D quality grade, which describes the signal and the clarity of the seismic phases used to locate it. [InSight location study](https://doi.org/10.1029/2023JE007826) · [Catalog events CSV](data/marsquakes.csv)

The Gale comparison uses the USGS center (5.44° S, 137.70° E) and a circular approximation based on the crater’s 155.30 km diameter. Surface distances use a Mars sphere with a 3,389.5 km radius. The map places InSight about 601 km from Gale’s center and shows zero cataloged source locations within the approximate rim. The closest plotted source is impact S0981c, about 365 km from Gale’s center. The closest plotted seismic epicenter is S0918a, about 1,172 km away. These results describe the located subset. InSight’s single station leaves local shaking and the frequency of quakes at Gale unresolved. [USGS Gale reference](https://planetarynames.wr.usgs.gov/Feature/Gale) · [InSight location study](https://doi.org/10.1029/2023JE007826)

Install Pillow and use Python 3.11 or later to rebuild the files. Download the [V14 multiorigin CXML](https://pds-geosciences.wustl.edu/insight/urn-nasa-pds-insight_seis/data_derived/mqs_catalog_v14/events_mars_extended_multiorigin_v14_2023-01-01.cxml) and the two [Mars Trek MOLA color-hillshade root tiles](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars). Save the west and east tiles as `mola-0.jpg` and `mola-1.jpg` in one directory. From the project root, run `python3 scripts/build_marsquakes.py /path/to/catalog.cxml /path/to/tiles`.

## Rebuild

The builder uses Python with `numpy`, `scipy`, `rasterio`, `contourpy`, and `Pillow`. Use the aligned GeoTIFFs in this folder or the original v3 mosaics. Supply the PLACES CSV and PIA20281 JPEG from the source list. The script’s help contains their direct URLs.

```sh
python scripts/build_bagnold.py \\
  --dem map/data/elevation.tif \\
  --ortho map/data/orthophoto.tif \\
  --places /path/to/localized_interp.csv \\
  --photo /path/to/PIA20281.jpg \\
  --output /path/to/generated-map-data
```
