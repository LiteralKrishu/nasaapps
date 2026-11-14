"""Build the May 2024 storm replay from Curiosity RAD and MAVEN SEP CDFs."""

import argparse
import csv
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
from cdflib import CDF, cdfepoch

START = datetime(2024, 5, 19, tzinfo=timezone.utc)
DAYS = 4
WINDOW_MINUTES = 30
WINDOW_SECONDS = WINDOW_MINUTES * 60
WINDOW_COUNT = DAYS * 24 * 60 // WINDOW_MINUTES
BACKGROUND_START = datetime(2024, 5, 15, tzinfo=timezone.utc)
EVENT_DAY = datetime(2024, 5, 20, tzinfo=timezone.utc)
EARLIER_RAD_PRODUCTS = (
    "msl_rad_obs-l2_2024136_v05.cdf",
    "msl_rad_obs-l2_2024137_v04.cdf",
    "msl_rad_obs-l2_2024138_v03.cdf",
    "msl_rad_obs-l2_2024139_v03.cdf",
)
RAD_PRODUCTS = (
    "msl_rad_obs-l2_2024140_v03.cdf",
    "msl_rad_obs-l2_2024141_v04.cdf",
    "msl_rad_obs-l2_2024142_v03.cdf",
    "msl_rad_obs-l2_2024143_v04.cdf",
)
MAVEN_PRODUCTS = (
    "mvn_sep_l2_s1-cal-svy-full_20240519_v04_r03.cdf",
    "mvn_sep_l2_s1-cal-svy-full_20240520_v04_r06.cdf",
    "mvn_sep_l2_s1-cal-svy-full_20240521_v04_r02.cdf",
    "mvn_sep_l2_s1-cal-svy-full_20240522_v04_r04.cdf",
)
RAD_ARCHIVE = "https://spdf.gsfc.nasa.gov/pub/data/aaa_planetary/msl/rad/cdf/obs-l2/2024/"
MAVEN_ARCHIVE = "https://spdf.gsfc.nasa.gov/pub/data/maven/sep/l2/s1-cal-svy-full/2024/05/"
ION_CHANNEL = 23
ION_ENERGY_KEV = 2243
ION_WIDTH_KEV = 609.6


def rad_observations(cdf):
    dates = cdfepoch.to_datetime(cdf.varget("EPOCH"))
    times = dates.astype("datetime64[ms]").astype(np.int64) / 1000
    column = list(cdf.varget("DOSIMETRY_OBS_LABEL")).index("Total Dose E")
    values = cdf.varget("DOSIMETRY_TOTAL")[:, column]
    exposure = cdf.varget("ALIVE_TIME")
    flags = np.char.strip(cdf.varget("FLAGGED_DATA"))
    if cdf.varattsget("DOSIMETRY_TOTAL")["UNITS"] != "uGray/day":
        raise ValueError("Unexpected RAD dose-rate units")
    return times, values, exposure, (flags == "") & ~np.isnat(dates) & (values > 0)


def maven_observations(cdf):
    times = cdf.varget("time_unix")
    values = cdf.varget("f_ion_flux")[:, ION_CHANNEL]
    exposure = cdf.varget("accum_time")
    state = cdf.varget("attenuator_state")
    # Use the same calibrated energy channel and attenuator configuration throughout.
    selected = state == 1
    energies = cdf.varget("f_ion_energy")[:, ION_CHANNEL]
    widths = cdf.varget("f_ion_denergy")[:, ION_CHANNEL]
    if cdf.varattsget("f_ion_flux")["UNITS"] != "#/cm^2/sec/ster/keV":
        raise ValueError("Unexpected MAVEN differential-flux units")
    valid = selected & np.isfinite(values)
    if not np.allclose(energies[valid], ION_ENERGY_KEV, atol=0.2) or not np.allclose(
        widths[valid], ION_WIDTH_KEV, atol=0.2
    ):
        raise ValueError("Unexpected MAVEN channel energy or width")
    return times, values, exposure, selected


def iso_utc(time):
    return time.isoformat(timespec="seconds").replace("+00:00", "Z")


def rad_background(source):
    samples = []
    for name in EARLIER_RAD_PRODUCTS + RAD_PRODUCTS[:1]:
        times, values, weights, selected = rad_observations(CDF(source / name, validate=True))
        valid = selected & (times >= BACKGROUND_START.timestamp()) & (times < EVENT_DAY.timestamp())
        valid &= np.isfinite(values) & np.isfinite(weights) & (weights > 0)
        if not valid.any():
            raise ValueError(f"No background observations in {name}")
        samples.extend(values[valid])
    return {"start": iso_utc(BACKGROUND_START), "end": iso_utc(EVENT_DAY),
            "value": round(float(np.median(samples)), 5), "samples": len(samples)}


def aggregate(source, products, read_cdf):
    totals = np.zeros(WINDOW_COUNT)
    exposure_seconds = np.zeros(WINDOW_COUNT)
    sample_counts = np.zeros(WINDOW_COUNT, dtype=int)
    peak = None
    for filename in products:
        times, values, weights, selected = read_cdf(CDF(source / filename, validate=True))
        offset = times - START.timestamp()
        valid = selected & np.isfinite(offset) & (offset >= 0) & (offset < WINDOW_COUNT * WINDOW_SECONDS)
        valid &= np.isfinite(values) & (values >= 0) & np.isfinite(weights) & (weights > 0)
        if not valid.any():
            raise ValueError(f"No matching observations in {filename}")
        indices = (offset[valid] // WINDOW_SECONDS).astype(int)
        np.add.at(totals, indices, values[valid].astype(float) * weights[valid])
        np.add.at(exposure_seconds, indices, weights[valid])
        np.add.at(sample_counts, indices, 1)
        candidates = np.flatnonzero(valid)
        index = candidates[np.argmax(values[candidates])]
        reading = float(values[index])
        if peak is None or reading > peak["value"]:
            peak = {
                "time": iso_utc(datetime.fromtimestamp(times[index], timezone.utc)),
                "value": round(reading, 5),
                "window": int(offset[index] // WINDOW_SECONDS),
            }
    bins = [[round(amount / duration, 5) if duration else None, int(count)]
            for amount, duration, count in zip(totals, exposure_seconds, sample_counts)]
    return bins, peak


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Directory with May 15–22 RAD and May 19–22 SEP CDFs")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "map" / "data")
    args = parser.parse_args()
    rad, peak = aggregate(args.source, RAD_PRODUCTS, rad_observations)
    maven, _ = aggregate(args.source, MAVEN_PRODUCTS, maven_observations)
    background = rad_background(args.source)
    data = {
        "start": iso_utc(START),
        "eventDay": iso_utc(EVENT_DAY),
        "windowMinutes": WINDOW_MINUTES,
        "radPeak": peak,
        "radBackground": background,
        "radProducts": [RAD_ARCHIVE + name for name in EARLIER_RAD_PRODUCTS + RAD_PRODUCTS],
        "mavenProducts": [MAVEN_ARCHIVE + name for name in MAVEN_PRODUCTS],
        "rows": [rad_bin + maven_bin for rad_bin, maven_bin in zip(rad, maven)],
    }
    args.output.mkdir(parents=True, exist_ok=True)
    with (args.output / "solar-storm.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(["utc_window_start", "utc_window_end", "rad_e_uGy_per_day", "rad_samples",
                         "maven_sep1_forward_2243keV_ions_per_cm2_s_sr_keV", "maven_samples", "rad_background_uGy_per_day",
                         "rad_product", "maven_product"])
        for i, row in enumerate(data["rows"]):
            start = START + timedelta(minutes=i * WINDOW_MINUTES)
            end = start + timedelta(minutes=WINDOW_MINUTES)
            day = (start - START).days
            writer.writerow([iso_utc(start), iso_utc(end), *row, background["value"], RAD_PRODUCTS[day], MAVEN_PRODUCTS[day]])
    (args.output / "solar-storm.js").write_text(
        "window.marsStorm = " + json.dumps(data, separators=(",", ":"), allow_nan=False) + ";\n",
        encoding="utf-8",
    )
    print(f"{sum(bool(row[1]) for row in data['rows'])} RAD windows, "
          f"{sum(bool(row[3]) for row in data['rows'])} MAVEN windows, RAD peak {peak}, background {background}")


if __name__ == "__main__":
    main()
