import { createHmac } from "crypto";
import { config } from "../config/env";

export type EkoAuthHeaders = {
  developer_key: string;
  "secret-key": string;
  "secret-key-timestamp": string;
};

export type EkoProbeResult = {
  ok: boolean;
  status: number;
  url: string;
  contentType: string;
  bodyPreview: string;
  diagnosis: string;
  response?: Record<string, unknown>;
};

const isEkoBusinessSuccess = (payload: Record<string, unknown>) => {
  const status = Number(payload.status);
  const message = String(payload.message || "").toUpperCase();
  return status === 0 || message === "SUCCESS";
};

/** Build per-request Eko auth headers (HMAC-SHA256 over millisecond timestamp). */
export const buildEkoAuthHeaders = (timestampMs: number = Date.now()): EkoAuthHeaders => {
  const accessKey = config.ekoAccessKey.trim();
  const developerKey = config.ekoDeveloperKey.trim();
  if (!accessKey || !developerKey) {
    throw new Error("Eko credentials are not configured on the server");
  }

  const timestamp = String(timestampMs);
  const encodedKey = Buffer.from(accessKey, "utf8").toString("base64");
  const secretKey = createHmac("sha256", encodedKey).update(timestamp, "utf8").digest("base64");

  return {
    developer_key: developerKey,
    "secret-key": secretKey,
    "secret-key-timestamp": timestamp
  };
};

export const isEkoConfigured = () =>
  Boolean(config.ekoBaseUrl && config.ekoDeveloperKey && config.ekoAccessKey && config.ekoInitiatorId);

export const getEkoRuntimeConfig = () => ({
  baseUrl: config.ekoBaseUrl,
  initiatorId: config.ekoInitiatorId ? `${config.ekoInitiatorId.slice(0, 4)}…` : "",
  developerKeyPrefix: config.ekoDeveloperKey ? `${config.ekoDeveloperKey.slice(0, 8)}…` : "",
  hasAccessKey: Boolean(config.ekoAccessKey),
  hasUserCode: Boolean(config.ekoUserCode),
  configured: isEkoConfigured()
});

const buildEkoUrl = (path: string) => {
  const base = config.ekoBaseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

const buildSettlementBalanceUrl = (apiVersion: "v1" | "v2" = "v1") => {
  const initiatorId = config.ekoInitiatorId.replace(/\D/g, "");
  const query = new URLSearchParams({ initiator_id: initiatorId });
  if (config.ekoUserCode) {
    query.set("user_code", config.ekoUserCode);
  }
  return buildEkoUrl(
    `/${apiVersion}/customers/mobile_number:${initiatorId}/balance?${query.toString()}`
  );
};

const diagnoseEkoResponse = (status: number, contentType: string, bodyPreview: string) => {
  if (status === 403) return "auth_failed_or_forbidden";
  if (status === 401) return "unauthorized";
  if (status === 0) return "network_or_timeout";
  if (status >= 500) return "eko_server_error";
  if (contentType.includes("application/json") && status >= 200 && status < 300) return "api_reachable";
  if (contentType.includes("application/json")) return "api_error_json";
  return "unknown";
};

/** Settlement wallet balance for the configured initiator (read-only probe). */
export const getSettlementBalance = async (): Promise<{
  status: number;
  data: Record<string, unknown>;
  rawText: string;
  url: string;
}> => {
  if (!isEkoConfigured()) {
    throw new Error("Eko credentials are not configured on the server");
  }

  const url = buildSettlementBalanceUrl("v1");
  const auth = buildEkoAuthHeaders();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...auth
    }
  });

  const rawText = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
  } catch {
    data = { raw: rawText.slice(0, 500) };
  }

  return { status: response.status, data, rawText, url };
};

/** Safe live probe — used by /health/eko (no secrets in response). */
export const probeEkoSettlementBalance = async (): Promise<EkoProbeResult> => {
  if (!isEkoConfigured()) {
    return {
      ok: false,
      status: 0,
      url: "",
      contentType: "",
      bodyPreview: "Missing Eko credentials (EKO_DEVELOPER_KEY, EKO_ACCESS_KEY, EKO_INITIATOR_ID)",
      diagnosis: "missing_credentials"
    };
  }

  try {
    const result = await getSettlementBalance();
    const contentType = "application/json";
    const bodyPreview = result.rawText.replace(/\s+/g, " ").slice(0, 280);
    const diagnosis = diagnoseEkoResponse(result.status, contentType, bodyPreview);
    const businessOk = isEkoBusinessSuccess(result.data);

    return {
      ok: result.status >= 200 && result.status < 300 && businessOk,
      status: result.status,
      url: result.url,
      contentType,
      bodyPreview,
      diagnosis: businessOk ? diagnosis : "eko_business_error",
      response: result.data
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      url: buildSettlementBalanceUrl("v1"),
      contentType: "",
      bodyPreview: String(error?.message || error).slice(0, 280),
      diagnosis: "network_or_timeout"
    };
  }
};
