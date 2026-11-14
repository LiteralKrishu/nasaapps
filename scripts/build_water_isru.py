"""Build the Namib DAN overlay and regional SWIM maps from published data."""

import argparse
import csv
import json
from pathlib import Path

import numpy as np
from PIL import Image
import rasterio
from rasterio.windows import Window


ROOT = Path(__file__).resolve().parents[1]
GOBABEB_SAMPLE = "4549.1"
SWIM_FILES = {
    "shallow": ("SWIM4MIM_Ci_0_1.tif", 0.30),
    "middle": ("SWIM4MIM_Ci_1_5.tif", 0.40),
    "deep": ("SWIM4MIM_Ci_5.tif", 0.50),
}


def read_dan(source, survey):
    west, north = survey["origin"]
    width, height = survey["size"]
    scale = survey["metresPerDegree"]
    points = []
    with source.open(encoding="latin-1", newline="") as stream:
        for row in csv.DictReader(stream, delimiter=";"):
            lon = float(row["Longitude (center of pixel)"])
            lat = float(row["Latitude (center of pixel)"])
            x, y = lon * scale - west, north - lat * scale
            if not (0 <= x < width and 0 <= y < height):
                continue
            value, uncertainty = map(float, row["WEH values (wt.%)"].split("±"))
            points.append({
                "id": row["Pixel ID"], "mode": {"PAD": "Active", "PPD": "Passive"}[row["Pixel Type"]],
                "lon": lon, "lat": lat, "x": round(x, 2), "y": round(y, 2),
                "weh": value, "uncertainty": uncertainty,
                "material": row["Associated Member of the Stratigraphic Column"],
            })
    return points


def swim_map(source, x, y, output):
    with rasterio.open(source) as dataset:
        if dataset.crs != rasterio.crs.CRS.from_string("ESRI:103885") or dataset.nodata != -30:
            raise ValueError(f"Unexpected SWIM projection or NoData in {source.name}")
        row, column = dataset.index(x, y)
        window = Window(column - 30, row - 24, 61, 49)
        grid = dataset.read(1, window=window, masked=True)
        if grid.shape != (49, 61) or np.any(np.abs(grid.compressed()) > 1):
            raise ValueError(f"Unexpected SWIM window or score in {source.name}")
        bounds = dataset.window_bounds(window)
        score = grid[24, 30]
        cell_size = abs(dataset.res[0])

    # Fixed palette across depths. The gray checks mark only source NoData.
    stops = np.array([-1, 0, 1])
    colors = np.array([[184, 109, 71], [48, 52, 48], [155, 217, 224]])
    pixels = np.stack([np.interp(grid.filled(0), stops, channel) for channel in colors.T], axis=-1)
    missing = np.ma.getmaskarray(grid)
    checks = np.indices(grid.shape).sum(axis=0) % 2
    pixels[missing] = np.where(checks[missing, None] == 0, 113, 72)
    Image.fromarray(pixels.astype(np.uint8)).save(output)
    return {
        "score": None if np.ma.is_masked(score) else round(float(score), 5),
        "mapX": round((x - bounds[0]) / (bounds[2] - bounds[0]) * 100, 3),
        "mapY": round((bounds[3] - y) / (bounds[3] - bounds[1]) * 100, 3),
        "cellMetres": round(cell_size, 2),
        "sourceFile": source.name,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dan", type=Path, help="Zenodo DAN_Pixelization_Table_sol_3333.csv")
    parser.add_argument("swim", type=Path, help="Directory with the three SWIM4MIM GeoTIFFs")
    parser.add_argument("--output", type=Path, default=ROOT / "map" / "data")
    args = parser.parse_args()
    survey_text = (ROOT / "map" / "data" / "survey.js").read_text(encoding="utf-8")
    survey = json.loads(survey_text.partition("=")[2].strip().removesuffix(";"))
    points = read_dan(args.dan, survey)
    sample = next(point for point in points if point["id"] == GOBABEB_SAMPLE and point["mode"] == "Active")
    x, y = (sample[key] * survey["metresPerDegree"] for key in ("lon", "lat"))

    args.output.mkdir(parents=True, exist_ok=True)
    swim = {}
    for depth, (filename, threshold) in SWIM_FILES.items():
        swim[depth] = swim_map(args.swim / filename, x, y, args.output / f"swim-{depth}.png")
        swim[depth]["threshold"] = threshold
    data = {"gobabebSample": sample["id"], "dan": points, "swim": swim}
    (args.output / "water-isru.js").write_text(
        "window.marsWater = " + json.dumps(data, separators=(",", ":"), allow_nan=False) + ";\n", encoding="utf-8"
    )
    fields = ["id", "mode", "lon", "lat", "weh", "uncertainty", "material"]
    with (args.output / "dan-namib.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream, lineterminator="\n")
        writer.writerow(["pixel_id", "mode", "longitude_deg_e", "latitude_deg_n",
                         "weh_wt_pct", "weh_statistical_uncertainty_wt_pct", "stratigraphic_member"])
        writer.writerows([point[field] for field in fields] for point in points)
    print(f"{len(points)} local DAN records. SWIM values: { {key: layer['score'] for key, layer in swim.items()} }")


if __name__ == "__main__":
    main()
