#!/usr/bin/env bash
# Extract Firebase service account JSON from .env into a file (avoids broken inline JSON in .env).
set -euo pipefail

APP_DIR="${1:-/opt/vyaha/backend}"
ENV_FILE="$APP_DIR/.env"
OUT_FILE="$APP_DIR/config/firebase-service-account.json"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No .env at $ENV_FILE — skipping Firebase credential materialization"
  exit 0
fi

cd "$APP_DIR"
node <<'NODE'
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const appDir = process.cwd();
const envFile = path.join(appDir, ".env");
const outFile = path.join(appDir, "config", "firebase-service-account.json");
const envText = fs.readFileSync(envFile, "utf8");

dotenv.config({ path: envFile });

const extractFirebaseJsonFromEnvFile = (rawEnvText) => {
  const marker = "FIREBASE_SERVICE_ACCOUNT_JSON=";
  const start = rawEnvText.indexOf(marker);
  if (start < 0) return "";

  const remainder = rawEnvText.slice(start + marker.length);
  if (remainder.startsWith("'") || remainder.startsWith('"')) {
    const quote = remainder[0];
    for (let index = 1; index < remainder.length; index += 1) {
      if (remainder[index] === quote && remainder[index - 1] !== "\\") {
        return remainder.slice(1, index);
      }
    }
  }

  const jsonStart = remainder.indexOf("{");
  const jsonEnd = remainder.lastIndexOf("}");
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    return remainder.slice(jsonStart, jsonEnd + 1);
  }

  return remainder.split(/\r?\n/)[0];
};

const parseJson = (raw) => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;

  const candidates = [
    trimmed,
    trimmed.replace(/^['"]|['"]$/g, ""),
    trimmed.replace(/\\n/g, "\n")
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  return null;
};

const inlineCandidates = [
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  extractFirebaseJsonFromEnvFile(envText)
];

let serviceAccount = null;
for (const candidate of inlineCandidates) {
  serviceAccount = parseJson(candidate);
  if (serviceAccount) break;
}

if (!serviceAccount && fs.existsSync(outFile)) {
  try {
    serviceAccount = JSON.parse(fs.readFileSync(outFile, "utf8"));
  } catch {
    serviceAccount = null;
  }
}

if (!serviceAccount) {
  console.error("Could not parse FIREBASE_SERVICE_ACCOUNT_JSON and no valid credentials file exists");
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(serviceAccount));

const nextEnv = envText
  .split(/\r?\n/)
  .filter((line) => !line.startsWith("FIREBASE_SERVICE_ACCOUNT_JSON=") && !line.startsWith("FIREBASE_SERVICE_ACCOUNT_PATH="))
  .join("\n")
  .replace(/\n?$/g, "\n");

fs.writeFileSync(envFile, `${nextEnv}FIREBASE_SERVICE_ACCOUNT_PATH=${outFile}\n`);
console.log("Materialized Firebase credentials at", outFile);
NODE
