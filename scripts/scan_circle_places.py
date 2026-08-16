#!/usr/bin/env python3
"""Grid-scan Google Places inside the My Maps circle. Runs on VPS only (IP-restricted key)."""
from __future__ import annotations

import csv
import json
import math
import os
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

POLY = [
    (17.3507692, 78.36202),
    (17.3776847, 78.3718306),
    (17.3929199, 78.3996398),
    (17.3961142, 78.4274489),
    (17.3915275, 78.4501082),
    (17.3800191, 78.456406),
    (17.3674954, 78.4601208),
    (17.3405332, 78.4503978),
    (17.3210329, 78.4318584),
    (17.3172232, 78.4191338),
    (17.3157069, 78.4050363),
    (17.3507692, 78.36202),
]

TYPES = ["restaurant", "bakery", "cafe", "meal_takeaway", "food"]
TEXT_QUERIES = [
    "tiffin",
    "tiffin center",
    "sweet shop",
    "mithai",
    "bakery",
    "hotel",
    "restaurant",
]


def load_key() -> str:
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if key:
        return key
    for env_path in (
        Path("/opt/vyaha/backend/.env"),
        Path("/var/www/vyaha-backend/.env"),
        Path("/root/NearU/backend/.env"),
    ):
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            if line.startswith("GOOGLE_MAPS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("GOOGLE_MAPS_API_KEY not found on VPS")


def inside(lat: float, lon: float) -> bool:
    ins = False
    for i in range(len(POLY) - 1):
        y1, x1 = POLY[i]
        y2, x2 = POLY[i + 1]
        if ((y1 > lat) != (y2 > lat)) and (
            lon < (x2 - x1) * (lat - y1) / ((y2 - y1) + 1e-12) + x1
        ):
            ins = not ins
    return ins


def http_get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "vyaha-places-scan/1.0"})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.loads(resp.read().decode("utf-8"))


def categorize(name: str, types: list[str]) -> str:
    n = (name or "").lower()
    t = set(types or [])
    if "tiffin" in n:
        return "tiffin"
    if "bakery" in t or re.search(r"baker|bakery|iyengar|cake|pastry", n):
        if re.search(r"sweet|mithai", n):
            return "bakery_and_sweets"
        return "bakery"
    if re.search(r"sweet|mithai|halwa|ice cream|kulfi", n) or "confectionery" in t:
        return "sweets"
    if "cafe" in t or "cafe" in n or "coffee" in n:
        return "cafe"
    if "meal_takeaway" in t or re.search(
        r"pizza|burger|shawarma|kfc|mcdonald|domino|subway|fast food", n
    ):
        return "fast_food"
    return "restaurant"


def fetch_nearby(key: str, lat: float, lng: float, ptype: str) -> list[dict]:
    out = []
    token = None
    for _ in range(3):
        params = {
            "location": f"{lat},{lng}",
            "radius": "900",
            "type": ptype,
            "key": key,
        }
        if token:
            params = {"pagetoken": token, "key": key}
            time.sleep(2.1)
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?" + urllib.parse.urlencode(
            params
        )
        data = http_get(url)
        status = data.get("status")
        if status not in ("OK", "ZERO_RESULTS"):
            print(f"nearby status={status} type={ptype} err={data.get('error_message')}")
            break
        out.extend(data.get("results") or [])
        token = data.get("next_page_token")
        if not token:
            break
    return out


def fetch_text(key: str, query: str, lat: float, lng: float) -> list[dict]:
    out = []
    token = None
    for _ in range(3):
        params = {
            "query": query,
            "location": f"{lat},{lng}",
            "radius": "2500",
            "key": key,
        }
        if token:
            params = {"pagetoken": token, "key": key}
            time.sleep(2.1)
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json?" + urllib.parse.urlencode(
            params
        )
        data = http_get(url)
        status = data.get("status")
        if status not in ("OK", "ZERO_RESULTS"):
            print(f"text status={status} q={query} err={data.get('error_message')}")
            break
        out.extend(data.get("results") or [])
        token = data.get("next_page_token")
        if not token:
            break
    return out


def grid_points(step_m: float = 700.0):
    lats = [p[0] for p in POLY]
    lons = [p[1] for p in POLY]
    min_lat, max_lat = min(lats), max(lats)
    min_lon, max_lon = min(lons), max(lons)
    # approx degrees
    dlat = step_m / 111_320.0
    mid_lat = (min_lat + max_lat) / 2
    dlon = step_m / (111_320.0 * max(0.2, math.cos(math.radians(mid_lat))))
    lat = min_lat
    while lat <= max_lat + 1e-9:
        lon = min_lon
        while lon <= max_lon + 1e-9:
            if inside(lat, lon):
                yield round(lat, 6), round(lon, 6)
            lon += dlon
        lat += dlat


def main():
    key = load_key()
    places: dict[str, dict] = {}
    points = list(grid_points())
    print(f"grid_points={len(points)}")

    for i, (lat, lng) in enumerate(points):
        for ptype in TYPES:
            for r in fetch_nearby(key, lat, lng, ptype):
                pid = r.get("place_id")
                loc = (r.get("geometry") or {}).get("location") or {}
                plat, plng = loc.get("lat"), loc.get("lng")
                if not pid or plat is None or plng is None:
                    continue
                if not inside(plat, plng):
                    continue
                places[pid] = {
                    "place_id": pid,
                    "name": r.get("name") or "",
                    "types": ",".join(r.get("types") or []),
                    "category": categorize(r.get("name") or "", r.get("types") or []),
                    "lat": round(plat, 6),
                    "lon": round(plng, 6),
                    "rating": r.get("rating") or "",
                    "user_ratings_total": r.get("user_ratings_total") or "",
                    "vicinity": r.get("vicinity") or r.get("formatted_address") or "",
                    "source": "nearby",
                }
        if (i + 1) % 5 == 0:
            print(f"progress nearby {i+1}/{len(points)} unique={len(places)}")

    # text searches from a few anchors inside circle
    anchors = [
        (17.356, 78.387),  # Suncity / Bandlaguda
        (17.370, 78.428),  # Attapur
        (17.350, 78.400),  # south
        (17.385, 78.430),  # north-east
        (17.360, 78.410),  # center
    ]
    for lat, lng in anchors:
        for q in TEXT_QUERIES:
            for r in fetch_text(key, q, lat, lng):
                pid = r.get("place_id")
                loc = (r.get("geometry") or {}).get("location") or {}
                plat, plng = loc.get("lat"), loc.get("lng")
                if not pid or plat is None or plng is None:
                    continue
                if not inside(plat, plng):
                    continue
                if pid in places:
                    continue
                places[pid] = {
                    "place_id": pid,
                    "name": r.get("name") or "",
                    "types": ",".join(r.get("types") or []),
                    "category": categorize(r.get("name") or "", r.get("types") or []),
                    "lat": round(plat, 6),
                    "lon": round(plng, 6),
                    "rating": r.get("rating") or "",
                    "user_ratings_total": r.get("user_ratings_total") or "",
                    "vicinity": r.get("formatted_address") or r.get("vicinity") or "",
                    "source": f"text:{q}",
                }

    rows = sorted(places.values(), key=lambda x: (x["category"], x["name"].lower()))
    out = Path("/tmp/circle_places_google.csv")
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "category",
                "name",
                "lat",
                "lon",
                "rating",
                "user_ratings_total",
                "vicinity",
                "types",
                "place_id",
                "source",
            ],
        )
        w.writeheader()
        w.writerows(rows)

    counts: dict[str, int] = {}
    for r in rows:
        counts[r["category"]] = counts.get(r["category"], 0) + 1
    print(f"TOTAL={len(rows)}")
    print("COUNTS=" + json.dumps(counts, sort_keys=True))
    print(f"CSV={out}")


if __name__ == "__main__":
    main()
