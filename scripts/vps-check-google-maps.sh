#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-/opt/vyaha/backend/.env}"
KEY="$(grep -E '^GOOGLE_MAPS_API_KEY=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- | tr -d '\r')"

if [[ -z "$KEY" ]]; then
  echo "Google check: missing key"
  exit 0
fi

GOOGLE_CHECK_KEY="$KEY" node <<'NODE'
const key = process.env.GOOGLE_CHECK_KEY || "";
const query = encodeURIComponent("Balaji Abode, Westend Colony, Bandlaguda Jagir, Hyderabad");

const checks = [
  ["geocode", `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&region=in&components=country:IN&key=${key}`],
  ["places", `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&region=in&key=${key}`]
];

(async () => {
  for (const [name, url] of checks) {
    try {
      const data = await (await fetch(url)).json();
      const first = (data.results && data.results[0]) || {};
      const label = String(first.formatted_address || first.name || "").slice(0, 140);
      const error = data.error_message ? ` ${data.error_message}` : "";
      console.log(`Google ${name}: ${data.status}${error} ${label}`.trim());
    } catch (error) {
      console.log(`Google ${name}: error ${error.message}`);
    }
  }
})();
NODE
