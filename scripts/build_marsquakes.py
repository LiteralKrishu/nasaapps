"""Bundle the InSight Marsquake Service V14 catalog and a Mars Trek basemap."""

import argparse
import csv
from datetime import datetime
import hashlib
import json
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from PIL import Image, ImageOps


NS = {"b": "http://quakeml.org/xmlns/bed/1.2", "m": "http://quakeml.org/xmlns/bed/1.2/mars"}
CATALOG_HASH = "4c33de988267aab4acd0c1ddd768e70c7892a9770941accf40dba89e08fb0d79"
INSIGHT = {"latitude": 4.5024, "longitude": 135.6234}
GALE = {"latitude": -5.44, "longitude": 137.70, "diameterKm": 155.30}
MARS_RADIUS_KM = 3389.5


def distance_km(first, second):
    lat, lon = radians(first["latitude"]), radians(first["longitude"])
    other_lat, other_lon = radians(second["latitude"]), radians(second["longitude"])
    half_chord = sin((other_lat - lat) / 2) ** 2 + cos(lat) * cos(other_lat) * sin((other_lon - lon) / 2) ** 2
    return 2 * MARS_RADIUS_KM * asin(sqrt(min(1, half_chord)))


def read(node, path):
    return node.findtext(path, namespaces=NS)


def preferred(event, kind):
    identifier = read(event, f"b:preferred{kind.title()}ID")
    if identifier is None and kind == "magnitude":
        return None
    return next(node for node in event.findall(f"b:{kind}", NS) if node.get("publicID") == identifier)


def number(node, path):
    value = read(node, path)
    return float(value) if value is not None else None


def quantity(node, path, prefix):
    value = number(node, f"{path}/{prefix}:value")
    if value is None:
        return None
    symmetric = number(node, f"{path}/{prefix}:uncertainty")
    result = {"value": value}
    for side in ("lower", "upper"):
        uncertainty = number(node, f"{path}/{prefix}:{side}Uncertainty")
        result[side] = uncertainty if uncertainty is not None else symmetric
    return result


def load_catalog(path):
    # Pin the release because its placeholder coordinates and export totals are version-specific.
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != CATALOG_HASH:
        raise ValueError("Expected the original Marsquake Service V14 multiorigin CXML")

    rows = []
    for _, event in ET.iterparse(path, events=["end"]):
        if event.tag != f"{{{NS['b']}}}event":
            continue
        name = next(read(item, "b:text") for item in event.findall("b:description", NS)
                    if read(item, "b:type") == "earthquake name")
        if re.fullmatch(r"S\d{4}[a-z]+", name):
            origin = preferred(event, "origin")
            magnitude = preferred(event, "magnitude")
            impact = read(event, "b:type") == "meteorite"
            if impact:
                # The eight confirmed impacts have a separate orbitally identified surface origin.
                orbit_origin = next(item for item in event.findall("b:origin", NS)
                                    if "/algorithms/location/" in (read(item, "b:methodID") or ""))
            else:
                orbit_origin = origin
            epicenter = {
                "latitude": number(orbit_origin, "b:latitude/b:value"),
                "longitude": number(orbit_origin, "b:longitude/b:value"),
            }
            rows.append({
                "id": name,
                "utc": read(origin, "b:time/b:value"),
                "impact": impact,
                "signal": read(event, "m:type").split("#")[-1],
                "quality": read(origin, "m:locationQuality").split("#")[-1],
                "epicenter": epicenter if epicenter != INSIGHT else None,
                "distance": quantity(orbit_origin, "m:distance", "m"),
                "bearing": quantity(orbit_origin, "m:BAZ", "m"),
                "magnitude": quantity(magnitude, "b:mag", "b") if magnitude is not None else None,
                "scale": read(magnitude, "b:type") if magnitude is not None else None,
            })
        event.clear()

    rows.sort(key=lambda row: (datetime.fromisoformat(row["utc"]), row["id"]))
    if len(rows) != 1323 or len({row["id"] for row in rows}) != len(rows):
        raise ValueError("Unexpected V14 event count or duplicate name")
    return rows


def write_catalog(rows, output):
    mapped = [(distance_km(GALE, row["epicenter"]), row["id"]) for row in rows if row["epicenter"]]
    nearest_distance, nearest_id = min(mapped)
    nearest_quake_distance, nearest_quake_id = min(
        (distance_km(GALE, row["epicenter"]), row["id"])
        for row in rows if row["epicenter"] and not row["impact"]
    )
    gale = {
        **GALE, "stationKm": round(distance_km(INSIGHT, GALE)),
        "inside": sum(distance <= GALE["diameterKm"] / 2 for distance, _ in mapped),
        "nearest": {"id": nearest_id, "km": round(nearest_distance)},
        "nearestNonImpact": {"id": nearest_quake_id, "km": round(nearest_quake_distance)},
    }
    data = {"version": "14", "sha256": CATALOG_HASH, "insight": INSIGHT, "gale": gale, "events": rows}
    (output / "marsquakes.js").write_text(
        "window.MARSQUAKE_CATALOG = " + json.dumps(data, separators=(",", ":"), allow_nan=False) + ";\n",
        encoding="utf-8",
    )
    with (output / "marsquakes.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream, lineterminator="\n")
        writer.writerow([
            "event_id", "origin_utc", "cataloged_impact", "signal_type", "location_quality",
            "latitude_deg", "longitude_east_deg", "distance_deg", "distance_minus_deg", "distance_plus_deg",
            "back_azimuth_deg", "back_azimuth_minus_deg", "back_azimuth_plus_deg",
            "magnitude_scale", "magnitude", "magnitude_minus", "magnitude_plus",
        ])
        for row in rows:
            point = row["epicenter"] or {}
            distance = row["distance"] or {}
            bearing = row["bearing"] or {}
            magnitude = row["magnitude"] or {}
            writer.writerow([
                row["id"], row["utc"], int(row["impact"]), row["signal"], row["quality"],
                point.get("latitude"), point.get("longitude"), distance.get("value"),
                distance.get("lower"), distance.get("upper"), bearing.get("value"),
                bearing.get("lower"), bearing.get("upper"), row["scale"],
                magnitude.get("value"), magnitude.get("lower"), magnitude.get("upper"),
            ])


def build_basemap(tiles, target):
    with Image.open(tiles / "mola-0.jpg") as west, Image.open(tiles / "mola-1.jpg") as east:
        if west.size != (256, 256) or east.size != west.size:
            raise ValueError("Expected the two 256 px level-zero Mars Trek tiles")
        mosaic = Image.new("RGB", (512, 256))
        mosaic.paste(west, (0, 0))
        mosaic.paste(east, (256, 0))
    relief = ImageOps.grayscale(mosaic).resize((1024, 512), Image.Resampling.BICUBIC)
    image = ImageOps.colorize(relief, "#25231f", "#947459")
    image.save(target, "WEBP", quality=91, method=6)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("catalog", type=Path)
    parser.add_argument("tiles", type=Path, help="Directory with west and east MOLA root tiles")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "map/data")
    args = parser.parse_args()
    rows = load_catalog(args.catalog)
    args.output.mkdir(parents=True, exist_ok=True)
    build_basemap(args.tiles, args.output / "marsquake-basemap.webp")
    write_catalog(rows, args.output)


if __name__ == "__main__":
    main()
