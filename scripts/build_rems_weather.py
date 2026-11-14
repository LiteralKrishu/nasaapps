"""Bundle Bagnold campaign REMS MODRDR products as 30-minute LMST observations."""

import argparse
import csv
import json
import math
import re
import xml.etree.ElementTree as ET
from pathlib import Path

PHASES = ((1162, 1254), (1602, 1660))
BIN_MINUTES = 30
BINS_PER_SOL = 24 * 60 // BIN_MINUTES
PRODUCT_NAME = re.compile(r"RME_\d+RMD(\d{4})\w+\.xml", re.IGNORECASE)
MARS_TIME = re.compile(r"(\d{5})M([01]\d|2[0-3]):([0-5]\d):[0-5]\d(?:\.\d+)?")
ARCHIVE = "https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/data_calibrated/"
DAILY_SOURCE = "https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json"
# Flag offsets are zero-based and refer to the PDS4 product label.
# Pressure bit 0 selects an oscillator. Both settings are valid.
METRICS = (
    ("air_c", "AMBIENT_TEMP", "AMBIENT_TEMP_CONFIDENCE_LEVEL", (2, 7, 8), "KELVIN", 273.15),
    ("ground_c", "BRIGHTNESS_TEMP", "GTS_CONFIDENCE_LEVEL", (0, 1, 2, 3), "KELVIN", 273.15),
    ("pressure_pa", "PRESSURE", "PS_CONFIDENCE_LEVEL", (1,), "PASCAL", 0),
    ("wind_m_s", "HORIZONTAL_WIND_SPEED", "WS_CONFIDENCE_LEVEL", (0, 1, 2, 3, 4),
     "METERS/SECOND", 0),
)


def archive_folder(sol):
    prefix = "SOL_01160_01293" if sol < 1294 else "SOL_01515_01648" if sol <= 1648 else "SOL_01649_01772"
    return f"{ARCHIVE}{prefix}/SOL{sol:05d}/"


def read_daily(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    keys = ("min_temp", "max_temp", "min_gts_temp", "max_gts_temp", "pressure")
    rows = {}
    for row in data["soles"]:
        sol = int(row["sol"])
        if any(start <= sol <= end for start, end in PHASES):
            rows[sol] = {
                "date": row["terrestrial_date"],
                "values": [None if row[key] in ("--", "") else float(row[key]) for key in keys],
            }
    return rows


def read_product(label, sol):
    root = ET.parse(label).getroot()
    area = root.find("{*}File_Area_Observational")
    table = area.find("{*}Table_Character")
    schema = {
        field.findtext("{*}name"): field
        for field in table.findall("./{*}Record_Character/{*}Field_Character")
    }
    width = int(table.findtext("./{*}Record_Character/{*}fields"))
    expected = int(table.findtext("{*}records"))
    record_length = int(table.findtext("./{*}Record_Character/{*}record_length"))
    archive_name = area.findtext("./{*}File/{*}file_name")
    if Path(archive_name).name != archive_name:
        raise ValueError("Unexpected table path")
    table_path = label.with_name(archive_name)
    if table_path.stat().st_size != expected * record_length:
        raise ValueError("Incomplete archive table")

    def column(name):
        return int(schema[name].findtext("{*}field_number")) - 1

    columns = []
    for _, field, flag, checks, unit, offset in METRICS:
        if schema[field].findtext("{*}unit") != unit:
            raise ValueError(f"Unexpected unit for {field}")
        unknown = schema[field].findtext("./{*}Special_Constants/{*}unknown_constant", "-999")
        columns.append((column(field), column(flag), checks, float(unknown), offset))

    lmst = column("LMST")
    timestamp = column("TIMESTAMP")
    start = root.findtext("./{*}Observation_Area/{*}Time_Coordinates/{*}start_date_time")
    end = root.findtext("./{*}Observation_Area/{*}Time_Coordinates/{*}stop_date_time")
    seen = set()
    bins = [[[0.0, 0] for _ in METRICS] for _ in range(BINS_PER_SOL)]
    with table_path.open(newline="", encoding="ascii") as source:
        rows = csv.reader(source, skipinitialspace=True)
        count = 0
        for row in rows:
            count += 1
            if len(row) != width:
                raise ValueError(f"Invalid record width at row {count}")
            clock = MARS_TIME.fullmatch(row[lmst].strip())
            if clock is None or int(clock[1]) != sol:
                raise ValueError(f"Unexpected LMST at row {count}: {row[lmst]}")
            # The onboard clock field is an integer. The fractional LMST is the
            # sample time used to group data and identify duplicates.
            sample_key = (row[timestamp].strip(), clock[0])
            if sample_key in seen:
                continue
            seen.add(sample_key)
            minute = int(clock[2]) * 60 + int(clock[3])
            values = bins[minute // BIN_MINUTES]
            for metric, bucket, (index, flag_index, checks, missing, offset) in zip(METRICS, values, columns):
                flag = row[flag_index].strip()
                if any(bit >= len(flag) or flag[bit] != "1" for bit in checks):
                    continue
                field = row[index].strip()
                if field in ("UNK", "NULL", ""):
                    continue
                value = float(field)
                if not math.isfinite(value) or value == missing or value < 0:
                    continue
                if metric[0] == "wind_m_s" and (sol >= PHASES[1][0] or value > 20):
                    continue
                bucket[0] += value - offset
                bucket[1] += 1
        if count != expected:
            raise ValueError(f"Expected {expected} records, read {count}")
    return {
        "sol": sol,
        "startUtc": start,
        "stopUtc": end,
        "product": label.name,
        "bins": [[(round(total / n, 2), n) if n else (None, 0) for total, n in row] for row in bins],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Directory with PDS4 XML labels and original MODRDR TAB files")
    parser.add_argument("--daily", type=Path, required=True, help=f"NASA REMS daily archive JSON from {DAILY_SOURCE}")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "map" / "data")
    args = parser.parse_args()
    daily = read_daily(args.daily)
    products = {}
    errors = []
    for label in sorted(args.source.glob("*.xml")):
        match = PRODUCT_NAME.fullmatch(label.name)
        if match is None or not any(start <= int(match[1]) <= end for start, end in PHASES):
            continue
        sol = int(match[1])
        if sol in products:
            errors.append(f"Multiple product labels for sol {sol}")
            continue
        try:
            products[sol] = read_product(label, sol)
        except (ET.ParseError, KeyError, OSError, TypeError, ValueError) as exc:
            errors.append(f"{label.name}: {exc}")
    if errors:
        parser.exit(1, "\n".join(errors) + "\n")
    if not products:
        parser.error("No Bagnold MODRDR observations were found.")

    days = [sol for start, end in PHASES for sol in range(start, end + 1)]
    sols = [{"sol": sol, "folder": archive_folder(sol), "daily": daily.get(sol),
             **products.get(sol, {"bins": [], "product": None})} for sol in days]
    data = {
        "dailySource": DAILY_SOURCE, "phases": PHASES, "binMinutes": BIN_MINUTES, "sols": sols,
    }
    args.output.mkdir(parents=True, exist_ok=True)
    with (args.output / "rems-weather.csv").open("w", newline="", encoding="utf-8") as output:
        writer = csv.writer(output)
        writer.writerow(
            ["sol", "lmst_window_start", "source_label"]
            + [column for key, *_ in METRICS for column in (key + "_mean", key + "_samples")]
        )
        for sol in sols:
            for i, row in enumerate(sol["bins"]):
                hour, minute = divmod(i * BIN_MINUTES, 60)
                writer.writerow([sol["sol"], f"{hour:02d}:{minute:02d}", sol["product"], *(v for pair in row for v in pair)])
    (args.output / "weather.js").write_text(
        "window.curiosityWeather = " + json.dumps(data, separators=(",", ":"), allow_nan=False) + ";\n",
        encoding="utf-8",
    )
    with (args.output / "rems-daily.csv").open("w", newline="", encoding="utf-8") as output:
        writer = csv.writer(output)
        writer.writerow(["sol", "earth_date", "air_min_c", "air_max_c", "ground_min_c", "ground_max_c", "pressure_pa"])
        for sol in sols:
            day = sol["daily"]
            writer.writerow([sol["sol"], day["date"] if day else None, *(day["values"] if day else [None] * 5)])
    for start, end in PHASES:
        window = [entry for entry in sols if start <= entry["sol"] <= end]
        counts = [sum(any(row[i][1] for row in e["bins"]) for e in window) for i in range(len(METRICS))]
        print(f"Sols {start}–{end}: {sum(e['product'] is not None for e in window)} MODRDR tables, "
              f"{sum(e['daily'] is not None and any(v is not None for v in e['daily']['values']) for e in window)} daily reports with data, "
              f"{counts} sols with accepted air, ground, pressure and wind, respectively.")


if __name__ == "__main__":
    main()
