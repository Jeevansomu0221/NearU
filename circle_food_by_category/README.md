# Circle food shops (area1–area5)

Source: Google Places scan inside the My Map circle `1TgmzeKKTYotDlC5WhiE0djVTaVJlPUg`, cleaned to remove hospitals, schools, temples, salons, banks, etc.

## Files

| File | Contents |
|---|---|
| `bakeries.txt` / `bakeries_simple.txt` | Bakeries / bake houses |
| `restaurants.txt` / `restaurants_simple.txt` | Restaurants, hotels, kitchens, cafes |
| `tiffins.txt` / `tiffins_simple.txt` | Tiffin centres / mess / udupi-style |
| `fastfoods.txt` / `fastfoods_simple.txt` | Pizza, burger, shawarma, KFC, etc. |
| `sweets.txt` / `sweets_simple.txt` | Sweet shops, mithai, ice cream |
| `all_food_shops.csv` | Full master table |

`*_simple.txt` = easy reading: `name | area | address | maps_link | delivery_apps`

## Columns (tab-separated `.txt`)

- **name**
- **area** — `area1` … `area5` (or `area1+area4` if overlap; `outside_areas_but_in_circle` if inside the big circle but not in a numbered polygon)
- **address** — Google vicinity
- **maps_link** — Google Maps place link
- **delivery_apps** — best-effort only (Zomato/Swiggy do not publish a public registry API)
- **zomato_search** / **swiggy_search** — open these to confirm listing
- **rating** / **reviews** — Google rating counts

## Area map

- **area1** — NW (Hydershakote / Peeramcheru side)
- **area2** — SW (Bandlaguda Jagir / Kismatpur / Suncity south)
- **area3** — NE strip
- **area4** — Attapur / east
- **area5** — SE / Attapur–Budvel side
