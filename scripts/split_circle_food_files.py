#!/usr/bin/env python3
"""Clean circle Places dump into area-tagged bakery/restaurant/tiffin/fastfood/sweets txt files."""
from __future__ import annotations

import csv
import re
import urllib.parse
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"c:\Users\jeeva\OneDrive\NearU")
SRC = ROOT / "circle_scan_out" / "circle_places_google.csv"
OUT_DIR = ROOT / "circle_food_by_category"

AREAS = {
    "area1": [
        (17.3525613, 78.3657062),
        (17.351824, 78.3687103),
        (17.3520698, 78.3751905),
        (17.3545685, 78.3784522),
        (17.3606718, 78.3890522),
        (17.3678909, 78.4002207),
        (17.3733076, 78.4053816),
        (17.3810511, 78.3988344),
        (17.3880569, 78.3913429),
        (17.384988, 78.3863834),
        (17.3821646, 78.3802222),
        (17.3775289, 78.3719798),
        (17.3741627, 78.3713334),
        (17.3688228, 78.369118),
        (17.35932, 78.3659208),
        (17.3525613, 78.3657062),
    ],
    "area2": [
        (17.3519661, 78.3767171),
        (17.3421349, 78.3732839),
        (17.3304186, 78.3901925),
        (17.3295174, 78.4085603),
        (17.3461493, 78.4155984),
        (17.3527853, 78.4185166),
        (17.3672854, 78.4009643),
        (17.3650429, 78.397327),
        (17.3617355, 78.3934323),
        (17.3596261, 78.3886471),
        (17.3519661, 78.3767171),
    ],
    "area3": [
        (17.3883046, 78.3924593),
        (17.3734786, 78.4065356),
        (17.3736424, 78.4172644),
        (17.3805231, 78.4220709),
        (17.3955943, 78.4277358),
        (17.3929199, 78.3996398),
        (17.3883046, 78.3924593),
    ],
    "area4": [
        (17.3781477, 78.4207835),
        (17.3736424, 78.4172644),
        (17.3738881, 78.410398),
        (17.3706934, 78.4175219),
        (17.3719222, 78.4288515),
        (17.3739701, 78.4378638),
        (17.3612728, 78.4485068),
        (17.361109, 78.4539999),
        (17.3674954, 78.4601208),
        (17.3800191, 78.456406),
        (17.3915275, 78.4501082),
        (17.3955943, 78.4277358),
        (17.382489, 78.4231009),
        (17.3781477, 78.4207835),
    ],
    "area5": [
        (17.3597026, 78.4108356),
        (17.3527853, 78.4185166),
        (17.3461493, 78.4155984),
        (17.3365994, 78.4268001),
        (17.3276687, 78.4255985),
        (17.3218512, 78.4318641),
        (17.3405332, 78.4503978),
        (17.3674954, 78.4601208),
        (17.361109, 78.4539999),
        (17.3597846, 78.4489444),
        (17.3730553, 78.4369282),
        (17.3719222, 78.4288515),
        (17.3706934, 78.4175219),
        (17.3717447, 78.4121231),
        (17.3671573, 78.4076599),
        (17.3597026, 78.4108356),
    ],
}

# Strong food Google types
FOOD_TYPES = {
    "restaurant",
    "bakery",
    "cafe",
    "meal_takeaway",
    "meal_delivery",
    "bar",
    "night_club",
}

# Hard reject Google types (noise)
REJECT_TYPES = {
    "hospital",
    "doctor",
    "dentist",
    "pharmacy",
    "physiotherapist",
    "veterinary_care",
    "health",
    "school",
    "primary_school",
    "secondary_school",
    "university",
    "place_of_worship",
    "hindu_temple",
    "mosque",
    "church",
    "synagogue",
    "cemetery",
    "bank",
    "atm",
    "finance",
    "insurance_agency",
    "car_repair",
    "car_dealer",
    "gas_station",
    "parking",
    "police",
    "local_government_office",
    "post_office",
    "embassy",
    "fire_station",
    "transit_station",
    "bus_station",
    "subway_station",
    "train_station",
    "airport",
    "lodging",
    "rv_park",
    "campground",
    "park",
    "zoo",
    "museum",
    "library",
    "movie_theater",
    "bowling_alley",
    "casino",
    "spa",
    "beauty_salon",
    "hair_care",
    "gym",
    "clothing_store",
    "shoe_store",
    "jewelry_store",
    "electronics_store",
    "furniture_store",
    "home_goods_store",
    "hardware_store",
    "pet_store",
    "book_store",
    "bicycle_store",
    "florist",
    "laundry",
    "real_estate_agency",
    "moving_company",
    "storage",
    "general_contractor",
    "plumber",
    "electrician",
    "roofing_contractor",
    "painter",
    "locksmith",
    "travel_agency",
    "funeral_home",
    "political",
}

REJECT_NAME = re.compile(
    r"\b("
    r"hospital|clinic|diagnostic|dental|dentist|pharmacy|medical|poly\s*clinic|"
    r"doctor|dr\.|nursing|patholog|lab\b|scan\b|x[\s\-]?ray|"
    r"school|vidyalaya|college|university|coaching|tuition|"
    r"temple|mandir|mosque|masjid|church|dargah|dargha|gurudwara|church|"
    r"bank\b|atm\b|finance|insurance|loan|"
    r"petrol|diesel|fuel|gas\s*station|"
    r"salon|saloon|parlour(?!\s*(ice|milk|sweet))|parlor(?!\s*(ice|milk|sweet))|"
    r"gym|fitness|yoga|spa\b|"
    r"police|office\b|godown|warehouse|packers?\s*and\s*movers|"
    r"apartment|flats?\b|society\b|housing\s*board|real\s*estate|"
    r"water\s*plant|ro\s*plant|laundry|dry\s*clean|"
    r"hardware|electronics|mobile\s*shop|garments?|boutique|"
    r"workshop|garage|mechanic|tyre|puncture|"
    r"cemetery|graveyard|municipal|panchayat|"
    r"hearing\s*clinic|cupping"
    r")\b",
    re.I,
)

# Names that clearly indicate food even if Google types are weak
FOOD_NAME = re.compile(
    r"\b("
    r"restaurant|hotel|kitchen|cafe|caf[eé]|bakery|baker|bakers|cake|pastry|"
    r"tiffin|tiffins|mess|dhaba|biryani|mandi|shawarma|grill|barbeque|bbq|"
    r"pizza|burger|subway|mcdonald|dominos|domino|kfc|starbucks|"
    r"sweet|sweets|mithai|halwa|laddu|ice\s*cream|kulfi|dessert|"
    r"udupi|iyengar|meals?|canteen|food\s*court|cloud\s*kitchen|"
    r"juice|chat|chaat|dosa|idli|paratha|thali|chinese|arabian|"
    r"bawarchi|mehfil|paradise|niloufer|pista\s*house|karachi"
    r")\b",
    re.I,
)

TIFFIN_NAME = re.compile(r"\btiffins?\b|\bmess\b|\budupi\b|\bidli\b|\bdosa\b", re.I)
SWEET_NAME = re.compile(
    r"\bsweets?\b|\bmithai\b|\bhalwa\b|\bice\s*cream\b|\bkulfi\b|\bconfection",
    re.I,
)
BAKERY_NAME = re.compile(
    r"\bbakers?\b|\bbakery\b|\bbake\s*house\b|\bbakes\b|\bpatisserie\b|\biyengar\b|"
    r"\bcake\s*shop\b|\bpastry\b",
    re.I,
)
CAKE_ONLY = re.compile(r"\bcake\b|\bcupcake\b|\bbrownies?\b", re.I)
FAST_NAME = re.compile(
    r"\bpizza\b|\bburger\b|\bshawarma\b|\bfries\b|\bwrap\b|\bsubway\b|"
    r"\bmcdonald|\bdominos?\b|\bkfc\b|\bwow\s*momo|\bfast\s*food\b|"
    r"\bwings\b|\bmomos?\b|\broills?\b|\brolls\b",
    re.I,
)

CHAIN_DELIVERY = re.compile(
    r"\b("
    r"domino'?s|mcdonald'?s|burger\s*king|kfc|subway|pizza\s*hut|"
    r"paradise|bawarchi|mehfil|pista\s*house|cafe\s*niloufer|niloufer|"
    r"starbucks|barbeque\s*nation|palamuru\s*grill|taaza\s*tiffins|"
    r"just\s*bake|sweet\s*truth|faasos|behrouz|oven\s*story|ovenstory|"
    r"lunchbox|box8|eatfit|natural\s*ice\s*cream|"
    r"baskin|ibaco|cream\s*stone|polar\s*bear|"
    r"7th\s*heaven|harley'?s|ks\s*bakers|karachi\s*bakery|"
    r"uncle\s*peter|istah|wow!?\s*momo|la\s*pino'?s?|zomoz|"
    r"syla\s*kitchen|raju\s*gari|shah\s*ghouse|imperial\s*multicuisine|"
    r"leons?\s*burgers|fruitoholic|naatu\s*kodi|golden\s*palace|"
    r"ambika\s*tiffin|preeti\s*tiffin|manikanta\s*tiffin"
    r")\b",
    re.I,
)


def inside(lat: float, lon: float, poly: list[tuple[float, float]]) -> bool:
    ins = False
    for i in range(len(poly) - 1):
        y1, x1 = poly[i]
        y2, x2 = poly[i + 1]
        if ((y1 > lat) != (y2 > lat)) and (
            lon < (x2 - x1) * (lat - y1) / ((y2 - y1) + 1e-12) + x1
        ):
            ins = not ins
    return ins


def which_area(lat: float, lon: float) -> str:
    hits = [name for name, poly in AREAS.items() if inside(lat, lon, poly)]
    if not hits:
        return "outside_areas_but_in_circle"
    # Prefer smallest / most specific: if multiple, join sorted
    if len(hits) == 1:
        return hits[0]
    return "+".join(sorted(hits))


def maps_link(name: str, lat: float, lon: float, place_id: str) -> str:
    if place_id:
        return f"https://www.google.com/maps/place/?q=place_id:{place_id}"
    q = urllib.parse.quote(f"{name} @{lat},{lon}")
    return f"https://www.google.com/maps/search/?api=1&query={q}"


def zomato_search_link(name: str) -> str:
    q = urllib.parse.quote(name)
    return f"https://www.zomato.com/hyderabad/restaurants?q={q}"


def swiggy_search_link(name: str) -> str:
    q = urllib.parse.quote(name)
    return f"https://www.swiggy.com/search?query={q}"


def delivery_status(name: str, reviews: str, types: set[str]) -> str:
    if CHAIN_DELIVERY.search(name or ""):
        return "Likely on Zomato+Swiggy (known chain)"
    if "meal_delivery" in types:
        return "Likely on delivery apps (Google meal_delivery)"
    try:
        rev = int(float(reviews or 0))
    except ValueError:
        rev = 0
    if rev >= 100:
        return "Possibly on Zomato/Swiggy (100+ Google reviews) - verify"
    if rev >= 30:
        return "Possibly listed - verify via Zomato/Swiggy search links"
    return "Unknown - verify on Zomato/Swiggy"


def is_food_place(name: str, types: set[str]) -> bool:
    if types & REJECT_TYPES and not (types & FOOD_TYPES):
        return False
    if REJECT_NAME.search(name or ""):
        # allow ice cream / milk parlour etc.
        if re.search(r"ice\s*cream|milk\s*parlour|sweet", name or "", re.I):
            pass
        else:
            return False
    if types & FOOD_TYPES:
        return True
    if "food" in types and FOOD_NAME.search(name or ""):
        return True
    if FOOD_NAME.search(name or ""):
        return True
    return False


def categorize(name: str, types: set[str]) -> str | None:
    n = name or ""
    if TIFFIN_NAME.search(n):
        return "tiffins"
    # sweets / mithai / ice cream
    if SWEET_NAME.search(n):
        return "sweets"
    # bakeries: Google bakery type or clear bakery/bake-house name
    if "bakery" in types or BAKERY_NAME.search(n):
        return "bakeries"
    # cake-only home kitchens without bakery type → sweets
    if CAKE_ONLY.search(n) and ("food" in types or "point_of_interest" in types):
        return "sweets"
    # fast food
    if FAST_NAME.search(n) or (
        "meal_takeaway" in types
        and not re.search(r"restaurant|hotel|biryani|mandi|kitchen|grill|dhaba", n, re.I)
    ):
        return "fastfoods"
    if "cafe" in types or re.search(r"\bcafe\b|\bcaf[eé]\b|\bcoffee\b", n, re.I):
        return "restaurants"
    if "restaurant" in types or "meal_takeaway" in types or re.search(
        r"restaurant|hotel|kitchen|grill|biryani|mandi|dhaba|meals|food\s*court",
        n,
        re.I,
    ):
        return "restaurants"
    if "food" in types and FOOD_NAME.search(n):
        return "restaurants"
    if FOOD_NAME.search(n):
        return "restaurants"
    return None


def main() -> None:
    rows = list(csv.DictReader(SRC.open(encoding="utf-8")))
    cleaned: list[dict] = []
    rejected = 0
    for r in rows:
        name = (r.get("name") or "").strip()
        if not name or len(name) < 2:
            rejected += 1
            continue
        # skip numeric junk / too short codes
        if re.fullmatch(r"\d+", name):
            rejected += 1
            continue
        types = {t.strip() for t in (r.get("types") or "").split(",") if t.strip()}
        if not is_food_place(name, types):
            rejected += 1
            continue
        cat = categorize(name, types)
        if not cat:
            rejected += 1
            continue
        try:
            lat = float(r["lat"])
            lon = float(r["lon"])
        except (KeyError, ValueError):
            rejected += 1
            continue
        area = which_area(lat, lon)
        place_id = (r.get("place_id") or "").strip()
        vicinity = (r.get("vicinity") or "").strip()
        cleaned.append(
            {
                "category": cat,
                "name": name,
                "area": area,
                "address": vicinity,
                "lat": lat,
                "lon": lon,
                "rating": r.get("rating") or "",
                "reviews": r.get("user_ratings_total") or "",
                "maps_link": maps_link(name, lat, lon, place_id),
                "zomato_search": zomato_search_link(name),
                "swiggy_search": swiggy_search_link(name),
                "delivery_apps": delivery_status(name, r.get("user_ratings_total") or "", types),
                "place_id": place_id,
                "types": ",".join(sorted(types)),
            }
        )

    # de-dupe by place_id else name+rounded coords
    uniq: dict[str, dict] = {}
    for r in cleaned:
        key = r["place_id"] or f"{r['name'].lower()}|{round(r['lat'],5)}|{round(r['lon'],5)}"
        prev = uniq.get(key)
        if not prev:
            uniq[key] = r
            continue
        # prefer higher review count
        try:
            if int(r["reviews"] or 0) > int(prev["reviews"] or 0):
                uniq[key] = r
        except ValueError:
            pass
    cleaned = list(uniq.values())

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for r in cleaned:
        by_cat[r["category"]].append(r)

    header = (
        "name\tarea\taddress\tmaps_link\tdelivery_apps\tzomato_search\tswiggy_search\trating\treviews"
    )
    counts = {}
    for cat in ["bakeries", "restaurants", "tiffins", "fastfoods", "sweets"]:
        items = sorted(by_cat.get(cat, []), key=lambda x: (x["area"], x["name"].lower()))
        counts[cat] = len(items)
        path = OUT_DIR / f"{cat}.txt"
        lines = [
            f"# {cat.upper()} inside My Map circle (area1–area5)",
            f"# total={len(items)}",
            f"# columns: {header}",
            "# delivery_apps: known chains / meal_delivery / review heuristics; always verify via zomato_search & swiggy_search",
            "",
            header,
        ]
        for r in items:
            lines.append(
                "\t".join(
                    [
                        r["name"].replace("\t", " "),
                        r["area"],
                        r["address"].replace("\t", " "),
                        r["maps_link"],
                        r["delivery_apps"],
                        r["zomato_search"],
                        r["swiggy_search"],
                        str(r["rating"]),
                        str(r["reviews"]),
                    ]
                )
            )
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")

        # also human-readable simple list
        simple = OUT_DIR / f"{cat}_simple.txt"
        s_lines = [f"# {cat} ({len(items)} shops)", ""]
        for r in items:
            s_lines.append(
                f"{r['name']} | {r['area']} | {r['address'] or 'n/a'} | {r['maps_link']} | {r['delivery_apps']}"
            )
        simple.write_text("\n".join(s_lines) + "\n", encoding="utf-8")

    # master csv
    master = OUT_DIR / "all_food_shops.csv"
    with master.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "category",
                "name",
                "area",
                "address",
                "maps_link",
                "delivery_apps",
                "zomato_search",
                "swiggy_search",
                "rating",
                "reviews",
                "lat",
                "lon",
                "place_id",
            ],
        )
        w.writeheader()
        for r in sorted(cleaned, key=lambda x: (x["category"], x["area"], x["name"].lower())):
            w.writerow({k: r[k] for k in w.fieldnames})

    area_c = Counter(r["area"] for r in cleaned)
    print("INPUT", len(rows), "REJECTED", rejected, "CLEAN", len(cleaned))
    print("COUNTS", counts)
    print("AREAS", dict(area_c))
    print("OUT", OUT_DIR)


if __name__ == "__main__":
    main()
