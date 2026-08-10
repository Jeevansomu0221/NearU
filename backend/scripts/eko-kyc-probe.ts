/**
 * Live Eko KYC probes: DigiLocker create, PAN-lite, bank-account sync.
 * Safe-ish: DigiLocker only creates a session (does not complete consent).
 * PAN/bank use clearly fake test values — expect INVALID / business errors if product is live.
 *
 * Usage: npm run eko:kyc-probe  (from backend/)
 */
import "dotenv/config";
import { createHmac, randomUUID } from "crypto";
import { config } from "../src/config/env";
import {
  getEkoRuntimeConfig,
  probeEkoDigiLocker,
  probeEkoSettlementBalance
} from "../src/services/eko.service";

type RawProbe = {
  name: string;
  ok: boolean;
  status: number;
  url: string;
  diagnosis: string;
  bodyPreview: string;
};

const clientRef = () => randomUUID().replace(/-/g, "").slice(0, 20);

const authHeaders = () => {
  const accessKey = config.ekoAccessKey.trim();
  const developerKey = config.ekoDeveloperKey.trim();
  const timestamp = String(Date.now());
  const encodedKey = Buffer.from(accessKey, "utf8").toString("base64");
  const secretKey = createHmac("sha256", encodedKey).update(timestamp, "utf8").digest("base64");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    developer_key: developerKey,
    "secret-key": secretKey,
    "secret-key-timestamp": timestamp
  };
};

const kycUrl = (path: string) => `${config.ekoKycBaseUrl.replace(/\/$/, "")}${path}`;

const postKyc = async (name: string, path: string, body: Record<string, unknown>): Promise<RawProbe> => {
  const url = kycUrl(path);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body)
    });
    const rawText = await response.text();
    const bodyPreview = rawText.replace(/\s+/g, " ").slice(0, 320);
    let businessOk = false;
    try {
      const json = rawText.trim() ? JSON.parse(rawText) : {};
      const status = Number(json.status);
      const message = String(json.message || "").toUpperCase();
      businessOk = status === 0 || message === "SUCCESS";
    } catch {
      businessOk = false;
    }

    let diagnosis = "unknown";
    if (response.status === 204 || !rawText.trim()) {
      diagnosis = "empty_response_product_may_be_disabled";
    } else if (response.status === 401 || response.status === 403) {
      diagnosis = "auth_failed";
    } else if (businessOk) {
      diagnosis = "api_reachable_success";
    } else if (response.status >= 200 && response.status < 300) {
      diagnosis = "http_ok_but_business_error_or_invalid_test_data";
    } else if (response.status >= 500) {
      diagnosis = "eko_server_error";
    } else {
      diagnosis = "api_error";
    }

    return {
      name,
      ok: response.status >= 200 && response.status < 300 && businessOk,
      status: response.status,
      url,
      diagnosis,
      bodyPreview: bodyPreview || "(empty)"
    };
  } catch (error: any) {
    return {
      name,
      ok: false,
      status: 0,
      url,
      diagnosis: "network_or_timeout",
      bodyPreview: String(error?.message || error).slice(0, 280)
    };
  }
};

const main = async () => {
  console.log("Eko runtime:", getEkoRuntimeConfig());
  console.log("\n=== 1) Settlement balance ===");
  const balance = await probeEkoSettlementBalance();
  console.log(JSON.stringify(balance, null, 2));

  console.log("\n=== 2) DigiLocker create (Aadhaar session) ===");
  const digilocker = await probeEkoDigiLocker();
  console.log(JSON.stringify(digilocker, null, 2));

  console.log("\n=== 3) PAN lite (dummy PAN — product reachability) ===");
  const pan = await postKyc("pan-lite", "/tools/kyc/pan-lite", {
    initiator_id: config.ekoInitiatorId,
    pan_number: "ABCDE1234F",
    name: "Test User",
    dob: "1990-01-01",
    client_ref_id: clientRef()
  });
  console.log(JSON.stringify(pan, null, 2));

  console.log("\n=== 4) Bank account sync (dummy account — product reachability) ===");
  const bank = await postKyc("bank-account-sync", "/tools/kyc/bank-account/sync", {
    initiator_id: config.ekoInitiatorId,
    bank_account: "1234567890",
    ifsc: "SBIN0000001",
    name: "Test User",
    client_ref_id: clientRef()
  });
  console.log(JSON.stringify(bank, null, 2));

  const summary = {
    balance: balance.ok,
    digilocker: digilocker.ok,
    pan: pan.ok || pan.diagnosis === "http_ok_but_business_error_or_invalid_test_data",
    bank: bank.ok || bank.diagnosis === "http_ok_but_business_error_or_invalid_test_data",
    note:
      "pan/bank 'reachable' if HTTP 2xx even with invalid dummy data; DigiLocker document/name extract needs a real rider DigiLocker consent in the app"
  };
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));

  const criticalOk = balance.ok && digilocker.ok;
  process.exit(criticalOk ? 0 : 1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
