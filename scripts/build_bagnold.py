"""Build the local Marswalk map from the official Gale mosaics and PLACES CSV."""

import argparse
import csv
import heapq
import json
import math
from pathlib import Path

from contourpy import contour_generator
import numpy as np
from PIL import Image, ImageOps
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import reproject, Resampling
from rasterio.windows import Window, from_bounds
from scipy.ndimage import distance_transform_edt, gaussian_filter, map_coordinates

WEST, NORTH = 8142270, -277285
WIDTH, HEIGHT = 290, 195
METRES_PER_DEGREE = 3396190 * math.pi / 180
EAST_SCALE = math.cos((NORTH - HEIGHT / 2) / 3396190)
BOUNDS = (WEST, NORTH - HEIGHT, WEST + WIDTH, NORTH)
ROOT = Path(__file__).resolve().parents[1]
DEM_URL = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif"
ORTHO_URL = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif"
PLACES_URL = "https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_interp.csv"
PHOTO_URL = "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia20/pia20281/PIA20281.jpg"
CLEARANCE = 7
SLOPE_LIMIT = 20
GRADE_WINDOW = 5
NEIGHBOURS = ((-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1))

# Map coordinates in projected metres east and south of the crop origin.
# The ring is traced on the USGS ortho with Ehlmann et al. (2017), Fig. 2 for identification.
DUNE = [(124, 0), (191, 0), (197, 9), (209, 22), (217, 38), (242, 51),
        (260, 58), (278, 61), (290, 56), (290, 150), (279, 152), (265, 149),
        (254, 156), (238, 162), (222, 157), (209, 146), (198, 133), (189, 127),
        (183, 116), (172, 114), (160, 116), (152, 123), (144, 128), (139, 122),
        (136, 111), (135, 99), (131, 86), (125, 77), (121, 69), (124, 61),
        (116, 56), (104, 50), (105, 44), (116, 40), (120, 32), (129, 26), (130, 11)]
START = (178.5, 127.5)
OBSERVATION = (109.5, 66.5)


def align(source, spacing, nodata, dtype):
    size = (round(HEIGHT / spacing), round(WIDTH / spacing))
    transform = from_origin(WEST, NORTH, spacing, spacing)
    destination = np.full(size, nodata, dtype=dtype)
    with rasterio.open(source) as dataset:
        if dataset.crs.to_authority() != ("ESRI", "103885"):
            raise ValueError(f"Unexpected Mars projection: {dataset.crs}")
        window = from_bounds(*BOUNDS, dataset.transform)
        col = max(0, math.floor(window.col_off) - 1)
        row = max(0, math.floor(window.row_off) - 1)
        height = min(math.ceil(window.row_off + window.height) - row + 1, dataset.height - row)
        width = min(math.ceil(window.col_off + window.width) - col + 1, dataset.width - col)
        window = Window(col, row, width, height)
        source_pixels = dataset.read(1, window=window)
        reproject(
            source_pixels, destination, src_transform=dataset.window_transform(window),
            src_crs=dataset.crs, src_nodata=dataset.nodata, dst_transform=transform,
            dst_crs=dataset.crs, dst_nodata=nodata, resampling=Resampling.bilinear,
        )
    return destination


def sample(image, points):
    x, y = np.array(points).T
    return map_coordinates(image, (y - 0.5, x - 0.5), order=1, mode="nearest")


def metric_length(vector):
    return math.hypot(vector[0] * EAST_SCALE, vector[1])


def dune_mask():
    x, y = np.meshgrid(np.arange(WIDTH) + 0.5, np.arange(HEIGHT) + 0.5)
    inside = np.zeros(x.shape, dtype=bool)
    for (a, b), (c, d) in zip(DUNE, DUNE[1:] + DUNE[:1]):
        if b != d:
            inside ^= ((b > y) != (d > y)) & (x < a + (c - a) * (y - b) / (d - b))
    return inside


def search_route(blocked, slope):
    start = tuple(map(int, START))
    end = tuple(map(int, OBSERVATION))
    distances = {start: 0.0}
    previous = {}
    candidates = [(0.0, 0.0, start)]
    if any(blocked[y, x] for x, y in (start, end)):
        raise ValueError("Route endpoints must be outside terrain exclusions")
    while candidates:
        _, cost, current = heapq.heappop(candidates)
        if current == end:
            break
        if distances[current] < cost:
            continue
        x, y = current
        for dx, dy in NEIGHBOURS:
            nx, ny = x + dx, y + dy
            if not (0 <= nx < WIDTH and 0 <= ny < HEIGHT):
                continue
            if blocked[ny, nx] or blocked[y, nx] or blocked[ny, x]:
                continue
            weight = 1 + (float(slope[ny, nx]) / 16) ** 2
            new_cost = cost + metric_length((dx, dy)) * weight
            neighbour = nx, ny
            if new_cost < distances.get(neighbour, math.inf):
                distances[neighbour] = new_cost
                previous[neighbour] = current
                estimate = metric_length((nx - end[0], ny - end[1]))
                heapq.heappush(candidates, (new_cost + estimate, new_cost, neighbour))
    if end not in previous:
        raise ValueError("No route found outside terrain exclusions")
    nodes = [end]
    while nodes[-1] != start:
        nodes.append(previous[nodes[-1]])
    return [(x + 0.5, y + 0.5) for x, y in reversed(nodes)]


def profile(path, elevation, clearance, mask):
    points = np.asarray(path)
    delta = np.diff(points, axis=0)
    step_distance = np.hypot(delta[:, 0] * EAST_SCALE, delta[:, 1])
    length = np.r_[0, np.cumsum(step_distance)]
    dist = np.linspace(0, length[-1], math.ceil(length[-1] / 0.5) + 1)
    locations = np.column_stack([np.interp(dist, length, axis) for axis in points.T])
    elevations = sample(elevation, locations)
    # Use approximately 5 m of route to estimate grade, and smooth ascent at ~1 m.
    smooth = gaussian_filter(elevations, 1 / (dist[1] - dist[0]))
    span = max(1, round(GRADE_WINDOW / (dist[1] - dist[0])))
    grade = np.degrees(np.arctan(np.abs(smooth[span:] - smooth[:-span]) /
                                  (dist[span:] - dist[:-span])))
    crossed = np.sum(sample(mask.astype(np.float32), (locations[1:] + locations[:-1]) / 2) >= 0.5)
    return {
        "path": path, "profile": np.round(np.column_stack((dist, locations, elevations)), 2).tolist(),
        "distance": round(float(length[-1]), 2), "ascent": round(float(np.maximum(np.diff(smooth), 0).sum()), 2),
        "peakGrade": round(float(max(grade)), 2),
        "clearance": round(float(sample(clearance, locations).min()), 2),
        "hazardDistance": round(float(crossed * (dist[1] - dist[0])), 2),
    }


def load_track(path):
    with Path(path).open(newline="") as data:
        rows = csv.DictReader(data)
        return [(int(row["sol"]), float(row["easting"]) - WEST, NORTH - float(row["northing"]),
                 float(row["elevation"])) for row in rows
                if row["frame"] == "ROVER" and 1185 <= int(row["sol"]) <= 1244]


def elevation_contours(elevation):
    grid_x = np.arange(WIDTH) + 0.5
    grid_y = np.arange(HEIGHT) + 0.5
    generator = contour_generator(grid_x, grid_y, gaussian_filter(elevation, 0.55))
    start = math.ceil(elevation.min() / 2) * 2
    return [{"level": level, "major": level % 10 == 0, "path": " ".join(
        "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in segment)
        for segment in generator.lines(level) if len(segment) > 4)}
        for level in range(start, math.ceil(elevation.max()), 2)]


def write_geotiff(output, array, spacing, nodata):
    with rasterio.open(output, "w", driver="GTiff", width=array.shape[1], height=array.shape[0],
                       count=1, dtype=array.dtype, crs="ESRI:103885",
                       transform=from_origin(WEST, NORTH, spacing, spacing), nodata=nodata,
                       compress="deflate") as dataset:
        dataset.write(array, 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dem", required=True, help=f"Local TIFF crop or {DEM_URL}")
    parser.add_argument("--ortho", required=True, help=f"Local TIFF crop or {ORTHO_URL}")
    parser.add_argument("--places", required=True, help=f"Local PLACES CSV from {PLACES_URL}")
    parser.add_argument("--photo", required=True, help=f"Local PIA20281 JPEG from {PHOTO_URL}")
    parser.add_argument("--output", type=Path, default=ROOT / "map" / "data")
    args = parser.parse_args()

    elevation = align(args.dem, 1, -32767, "float32")
    optical = align(args.ortho, 0.25, 0, "uint8")
    if np.any(elevation == -32767):
        raise ValueError("Elevation crop includes NoData")
    slope_y, slope_x = np.gradient(gaussian_filter(elevation, 0.75), 1, EAST_SCALE)
    slope = np.degrees(np.arctan(np.hypot(slope_y, slope_x)))
    mask = dune_mask()
    clearance = distance_transform_edt(~mask, sampling=(1, EAST_SCALE))
    has_imagery = optical.reshape(HEIGHT, 4, WIDTH, 4).all(axis=(1, 3))
    blocked = (clearance < CLEARANCE + 1) | (slope > SLOPE_LIMIT) | ~has_imagery
    detour = profile(search_route(blocked, slope), elevation, clearance, mask)
    direct = profile([START, OBSERVATION], elevation, clearance, mask)
    if detour["clearance"] < CLEARANCE or detour["hazardDistance"] > 0 or direct["hazardDistance"] == 0:
        raise ValueError("The proposed routes do not distinguish a valid detour from a dune crossing")

    positions = load_track(args.places)
    points = [(x, y) for _, x, y, _ in positions if 1 <= x < WIDTH - 1 and 1 <= y < HEIGHT - 1]
    z_reference = np.array([z for _, x, y, z in positions if 1 <= x < WIDTH - 1 and 1 <= y < HEIGHT - 1])
    z_residual = np.abs(sample(elevation, points) - z_reference)
    gobabeb = next((x, y) for sol, x, y, _ in reversed(positions) if sol == 1221)

    history = []
    for x, y in points:
        if not history or math.dist((x, y), history[-1]) > 0.5:
            history.append((round(x, 2), round(y, 2)))
    data = {
        "size": [WIDTH, HEIGHT], "origin": [WEST, NORTH], "metresPerDegree": METRES_PER_DEGREE,
        "eastScale": EAST_SCALE, "hazard": DUNE, "duneLabel": [179, 83],
        "contours": elevation_contours(elevation), "history": history,
        "routes": {"detour": detour, "direct": direct},
        "stops": [
            {"x": START[0], "y": START[1], "dx": 5, "dy": 6, "label": "Start", "anchor": "start"},
            {"x": OBSERVATION[0], "y": OBSERVATION[1], "dx": -5, "dy": 3, "label": "Observation stop", "anchor": "end"},
            {"x": round(gobabeb[0], 2), "y": round(gobabeb[1], 2), "dx": -5, "dy": -6,
             "label": "Gobabeb area", "anchor": "end"},
        ],
        "checks": {"demCells": int(elevation.size), "imageryPixels": int(optical.size),
                   "imageryNoData": int(np.count_nonzero(optical == 0)),
                   "roverPositions": len(points), "roverMedianVerticalResidualM": round(float(np.median(z_residual)), 2),
                   "roverP95VerticalResidualM": round(float(np.percentile(z_residual, 95)), 2)},
    }

    args.output.mkdir(parents=True, exist_ok=True)
    write_geotiff(args.output / "elevation.tif", elevation, 1, -32767)
    write_geotiff(args.output / "orthophoto.tif", optical, 0.25, 0)
    grayscale = ImageOps.autocontrast(Image.fromarray(optical), cutoff=(1, 1))
    toned = ImageOps.colorize(grayscale, "#25221c", "#ddc7a4", mid="#858071")
    toned.putalpha(Image.fromarray(np.where(optical == 0, 0, 255).astype(np.uint8)))
    toned.save(args.output / "imagery.webp", quality=88)
    rgba = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)
    for degrees, color in [(15, (236, 186, 112, 115)), (20, (236, 128, 80, 140)), (30, (225, 73, 61, 190))]:
        rgba[slope >= degrees] = color
    Image.fromarray(rgba).save(args.output / "slope.png")
    with Image.open(args.photo) as photo:
        photo.thumbnail((1000, 450))
        photo.save(args.output / "namib-surface.webp", quality=84)
    with (args.output / "profile.csv").open("w", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(["route", "distance_m", "easting_m", "northing_m", "elevation_m_areoid"])
        for name, route in data["routes"].items():
            writer.writerows((name, d, round(WEST + x, 2), round(NORTH - y, 2), z)
                             for d, x, y, z in route["profile"])
    (args.output / "survey.js").write_text("window.marsSurvey = " + json.dumps(data, separators=(",", ":")) + ";\n")
    print(json.dumps({"checks": data["checks"], "routes": {
        name: {key: value for key, value in route.items() if key not in ("path", "profile")}
        for name, route in data["routes"].items()}}, indent=2))


if __name__ == "__main__":
    main()
