"""Package the published SWIM depth layers and source-cell samples for offline use."""

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
import rasterio
from rasterio.enums import Resampling

# JSON data modules imported by the Next.js components.
DATA_MODULES = Path(__file__).resolve().parents[1] / "lib" / "data"

DEGREES_TO_METRES = 3396190 * math.pi / 180
SIZE = (1440, 480)
LAYERS = (
    ("shallow", "0–1 m", "SWIM4MIM_Ci_0_1.tif", 0.3),
    ("middle", "1–5 m", "SWIM4MIM_Ci_1_5.tif", 0.4),
    ("deep", ">5 m", "SWIM4MIM_Ci_5.tif", 0.5),
)
SITES = (
    ("namib", "Namib Dune, Gale Crater", 137.3671, -4.6790),
    ("jezero", "Jezero landing area", 77.4508, 18.4447),
    ("arcadia", "Arcadia Planitia", 188.15, 49.02),
    ("utopia", "Utopia Planitia", 117.52, 46.74),
)
PRODUCTS = "https://swim.psi.edu/output/SWIM4MIM/Global/Composite/"


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def load_basemap(source):
    with Image.open(source / "mola-0.jpg") as west, Image.open(source / "mola-1.jpg") as east:
        if west.size != east.size or west.width != west.height:
            raise ValueError("Expected a pair of square level-zero Mars Trek tiles")
        width = west.width
        mosaic = Image.new("RGB", (2 * width, width))
        mosaic.paste(west, (0, 0))
        mosaic.paste(east, (width, 0))
        # The two root tiles cover 180°W–180°E and 90°S–90°N.
        cropped = mosaic.resize(SIZE, Image.Resampling.BICUBIC, (0, width / 6, width * 2, width * 5 / 6))
    return np.asarray(ImageOps.grayscale(cropped), dtype=np.float32)


def render_layer(values, terrain, threshold, target):
    valid = ~np.ma.getmaskarray(values)
    values = values.filled(-30)
    significant = valid & (values >= threshold)
    relief = terrain / 255
    image = np.stack([39 + relief * 86, 38 + relief * 78, 35 + relief * 66], axis=-1)
    factor = np.clip((values[significant] - threshold) / (1 - threshold), 0, 1)[:, None]
    threshold_color = np.array([58, 113, 152])
    high_color = np.array([143, 233, 247])
    image[significant] = threshold_color + (high_color - threshold_color) * factor
    image[significant] *= (0.84 + relief[significant] * 0.26)[:, None]
    row, col = np.indices(values.shape)
    image[~valid] = np.where(((row[~valid] + col[~valid]) % 12 < 3)[:, None], [46, 45, 43], [25, 25, 23])
    Image.fromarray(np.uint8(np.clip(image, 0, 255))).save(target, "WEBP", quality=90, method=6)


def build(source, output):
    terrain = load_basemap(source)
    sites = [{"key": key, "name": name, "longitude": lon, "latitude": lat, "scores": {}}
             for key, name, lon, lat in SITES]
    coords = [((lon + 180) % 360 - 180, lat) for _, _, lon, lat in SITES]
    points = [(lon * DEGREES_TO_METRES, lat * DEGREES_TO_METRES) for lon, lat in coords]
    layers = []
    output.mkdir(parents=True, exist_ok=True)
    DATA_MODULES.mkdir(parents=True, exist_ok=True)

    for key, depth, filename, threshold in LAYERS:
        path = source / filename
        image = f"swim-{key}.webp"
        with rasterio.open(path) as dataset:
            expected_bounds = np.array([-180, -60, 180, 60]) * DEGREES_TO_METRES
            if (dataset.crs.to_authority() != ("ESRI", "103885") or dataset.shape != (2400, 7200)
                    or dataset.nodata != -30 or not np.allclose(dataset.bounds, expected_bounds, atol=1)):
                raise ValueError(f"Unexpected Mars grid or bounds in {filename}")
            native = dataset.read(1, masked=True)
            if native.count() == 0 or not np.all(np.isfinite(native.compressed())):
                raise ValueError(f"Invalid raster in {filename}")
            if native.min() < -1 or native.max() > 1:
                raise ValueError(f"Unexpected ice-consistency range in {filename}")
            values = dataset.read(1, out_shape=SIZE[::-1], masked=True, resampling=Resampling.nearest)
            for site, score in zip(sites, dataset.sample(points, masked=True)):
                site["scores"][key] = None if np.ma.is_masked(score[0]) else round(float(score[0]), 6)
        render_layer(values, terrain, threshold, output / image)
        layers.append({"key": key, "depth": depth, "threshold": threshold, "image": image,
                       "source": PRODUCTS + filename, "sha256": digest(path)})

    with Image.open(source / "moxie.jpg") as photo:
        photo.thumbnail((1000, 750), Image.Resampling.LANCZOS)
        photo.save(output / "moxie.webp", quality=86)
    data = {"layers": layers, "sites": sites}
    (DATA_MODULES / "swim-resources.json").write_text(
        json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "public" / "data")
    args = parser.parse_args()
    build(args.source, args.output)
