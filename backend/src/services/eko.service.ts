import { createHmac, randomUUID } from "crypto";
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

export type EkoDigiLockerSession = {
  initiationTransactionId: string;
  referenceId: string;
  verificationId: string;
  authorizationUrl: string;
  message: string;
};

export type EkoAadhaarProfile = {
  name: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  maskedAadhaar?: string;
  raw?: Record<string, unknown>;
};

export type EkoPanResult = {
  panNumber: string;
  name?: string;
  status?: string;
  nameMatch?: string;
  dobMatch?: string;
  raw?: Record<string, unknown>;
};

export type EkoBankResult = {
  accountStatus?: string;
  beneficiaryName?: string;
  nameMatchScore?: number;
  nameMatchResult?: boolean | string;
  raw?: Record<string, unknown>;
};

export type EkoGstResult = {
  gstin: string;
  valid: boolean;
  legalName?: string;
  tradeName?: string;
  status?: string;
  raw?: Record<string, unknown>;
};

export type EkoFssaiResult = {
  fssaiNumber: string;
  valid: boolean;
  businessName?: string;
  licenseStatus?: string;
  expiryDate?: string;
  raw?: Record<string, unknown>;
};

type EkoApiResponse = {
  status?: number | string;
  message?: string;
  response_status_id?: number;
  response_type_id?: number;
  code?: string;
  data?: Record<string, any>;
  [key: string]: unknown;
};

const newClientRefId = () => randomUUID().replace(/-/g, "").slice(0, 20);

const isEkoBusinessSuccess = (payload: EkoApiResponse) => {
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
  Boolean(config.ekoDeveloperKey && config.ekoAccessKey && config.ekoInitiatorId) || config.ekoMock;

export const getEkoRuntimeConfig = () => ({
  baseUrl: config.ekoBaseUrl,
  kycBaseUrl: config.ekoKycBaseUrl,
  initiatorId: config.ekoInitiatorId ? `${config.ekoInitiatorId.slice(0, 4)}…` : "",
  developerKeyPrefix: config.ekoDeveloperKey ? `${config.ekoDeveloperKey.slice(0, 8)}…` : "",
  hasAccessKey: Boolean(config.ekoAccessKey),
  hasUserCode: Boolean(config.ekoUserCode),
  digilockerRedirectUrl: config.ekoDigilockerRedirectUrl,
  mock: config.ekoMock,
  configured: isEkoConfigured()
});

const buildSettlementUrl = (path: string) => {
  const base = config.ekoBaseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

const buildKycUrl = (path: string) => {
  const base = config.ekoKycBaseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

const buildSettlementBalanceUrl = (apiVersion: "v1" | "v2" = "v1") => {
  const initiatorId = config.ekoInitiatorId.replace(/\D/g, "");
  const query = new URLSearchParams({ initiator_id: initiatorId });
  if (config.ekoUserCode) {
    query.set("user_code", config.ekoUserCode);
  }
  return buildSettlementUrl(
    `/${apiVersion}/customers/mobile_number:${initiatorId}/balance?${query.toString()}`
  );
};

const diagnoseEkoResponse = (status: number, contentType: string, bodyPreview: string) => {
  if (status === 403) return "auth_failed_or_forbidden";
  if (status === 401) return "unauthorized";
  if (status === 0) return "network_or_timeout";
  if (status === 204) return "empty_response_product_may_be_disabled";
  if (status >= 500) return "eko_server_error";
  if (contentType.includes("application/json") && status >= 200 && status < 300) return "api_reachable";
  if (contentType.includes("application/json")) return "api_error_json";
  return "unknown";
};

const parseJsonSafe = (rawText: string): EkoApiResponse => {
  if (!rawText.trim()) return {};
  try {
    return JSON.parse(rawText) as EkoApiResponse;
  } catch {
    return { raw: rawText.slice(0, 500) };
  }
};

const callEkoKyc = async (
  path: string,
  body: Record<string, unknown>,
  method: "GET" | "POST" = "POST"
): Promise<{ status: number; data: EkoApiResponse; rawText: string; url: string }> => {
  if (!isEkoConfigured()) {
    throw new Error("Eko credentials are not configured on the server");
  }

  const url = buildKycUrl(path);
  const auth = buildEkoAuthHeaders();
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...auth
    },
    body: method === "GET" ? undefined : JSON.stringify(body)
  });

  const rawText = await response.text();
  const data = parseJsonSafe(rawText);

  if (response.status === 204 || (!rawText.trim() && response.status >= 200 && response.status < 300)) {
    throw new Error(
      "Eko returned an empty response. Fund E-value and ask Eko to enable this KYC product on your live account."
    );
  }

  if (response.status >= 400) {
    throw new Error(
      String(data.message || data.code || `Eko KYC request failed (HTTP ${response.status})`)
    );
  }

  if (!isEkoBusinessSuccess(data) && Number(data.status) !== 0) {
    throw new Error(String(data.message || data.code || "Eko KYC request failed"));
  }

  return { status: response.status, data, rawText, url };
};

/** Encode DigiLocker reference + verification ids into one stored token. */
export const encodeDigiLockerSessionId = (referenceId: string, verificationId: string) =>
  `${referenceId}:${verificationId}`;

export const decodeDigiLockerSessionId = (token: string) => {
  const [referenceId, verificationId] = String(token || "").split(":");
  return {
    referenceId: String(referenceId || "").trim(),
    verificationId: String(verificationId || "").trim()
  };
};

export const initiateDigiLockerSession = async (
  redirectUrl?: string
): Promise<EkoDigiLockerSession> => {
  if (config.ekoMock) {
    const referenceId = `MOCK-REF-${Date.now()}`;
    const verificationId = `MOCK-VER-${Date.now()}`;
    return {
      initiationTransactionId: encodeDigiLockerSessionId(referenceId, verificationId),
      referenceId,
      verificationId,
      authorizationUrl: "",
      message: "Mock DigiLocker ready. Tap Continue after DigiLocker to complete."
    };
  }

  const payloadBody: Record<string, unknown> = {
    initiator_id: config.ekoInitiatorId,
    redirect_url: redirectUrl || config.ekoDigilockerRedirectUrl,
    document_requested: ["AADHAAR"],
    client_ref_id: newClientRefId()
  };
  if (config.ekoUserCode) {
    payloadBody.user_code = config.ekoUserCode;
  }

  const { data } = await callEkoKyc("/tools/kyc/digilocker", payloadBody);
  const nested = (data.data || {}) as Record<string, any>;
  const referenceId = String(nested.reference_id || nested.referenceId || "");
  const verificationId = String(nested.verification_id || nested.verificationId || "");
  const authorizationUrl = String(nested.url || nested.authorizationUrl || nested.authorization_url || "");

  if (!referenceId || !verificationId) {
    throw new Error("Eko DigiLocker did not return reference_id / verification_id");
  }
  if (!authorizationUrl) {
    throw new Error("Eko DigiLocker did not return an authorization URL");
  }

  return {
    initiationTransactionId: encodeDigiLockerSessionId(referenceId, verificationId),
    referenceId,
    verificationId,
    authorizationUrl,
    message: String(data.message || "Open DigiLocker to share e-Aadhaar")
  };
};

const pickName = (data: Record<string, any> | undefined) => {
  if (!data) return "";
  const user = data.user_details || data.userDetails || {};
  const candidates = [
    data.name,
    data.full_name,
    data.fullName,
    user.name,
    data.aadhaarName,
    data.proofOfIdentity?.name
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

/** Normalize DigiLocker / Aadhaar DOB into YYYY-MM-DD, or undefined if unusable. */
export const parseAadhaarDob = (raw: unknown): string | undefined => {
  if (raw == null) return undefined;
  const text = String(raw).trim();
  if (!text || /^invalid/i.test(text)) return undefined;

  // YYYY-MM-DD or YYYY/MM/DD
  let match = text.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // DD-MM-YYYY or DD/MM/YYYY (common Aadhaar format)
  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // DDMMYYYY
  match = text.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth() + 1;
    const day = parsed.getUTCDate();
    if (year >= 1900 && year <= 2100) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return undefined;
};

export const toValidDateOrUndefined = (raw: unknown): Date | undefined => {
  const iso = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : parseAadhaarDob(raw);
  if (!iso) return undefined;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const formatAddress = (data: Record<string, any> | undefined) => {
  if (!data) return "";
  if (typeof data.address === "string") return data.address.trim();
  const proof = data.proof_of_address || data.proofOfAddress || data.address || {};
  if (typeof proof === "string") return proof.trim();
  const parts = [
    proof.house,
    proof.street,
    proof.landmark,
    proof.loc,
    proof.vtc,
    proof.subdist,
    proof.dist,
    proof.state,
    proof.country,
    proof.pc || proof.pincode
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  return parts.join(", ");
};

export const fetchDigiLockerEAadhaar = async (input: {
  initiationTransactionId: string;
}): Promise<EkoAadhaarProfile> => {
  if (config.ekoMock) {
    return {
      name: "Mock DigiLocker Rider",
      dateOfBirth: "1995-01-15",
      gender: "M",
      address: "Hyderabad, Telangana, 500001",
      maskedAadhaar: "XXXXXXXX1234"
    };
  }

  const { referenceId, verificationId } = decodeDigiLockerSessionId(input.initiationTransactionId);
  if (!referenceId || !verificationId) {
    throw new Error("Invalid DigiLocker session. Start DigiLocker again.");
  }

  const body: Record<string, unknown> = {
    initiator_id: config.ekoInitiatorId,
    document_type: "AADHAAR",
    source: "API",
    client_ref_id: newClientRefId(),
    verification_id: verificationId,
    reference_id: Number.isFinite(Number(referenceId)) ? Number(referenceId) : referenceId
  };
  if (config.ekoUserCode) {
    body.user_code = config.ekoUserCode;
  }

  const { data } = await callEkoKyc("/tools/kyc/digilocker/document", body);
  const nested = (data.data || {}) as Record<string, any>;
  const userDetails = nested.user_details || nested.userDetails || nested;
  const name = pickName(nested) || pickName(userDetails);
  if (!name) {
    throw new Error(
      "DigiLocker e-Aadhaar not ready yet. Finish DigiLocker in the browser, then tap Continue again."
    );
  }

  const dob = parseAadhaarDob(
    userDetails.dob || nested.dob || nested.dateOfBirth || userDetails.date_of_birth || nested.date_of_birth
  );
  const uid = String(userDetails.uid || nested.uid || nested.aadhaar_number || "").replace(/\D/g, "");

  return {
    name,
    dateOfBirth: dob,
    gender: String(userDetails.gender || nested.gender || "").trim() || undefined,
    address: formatAddress(nested) || formatAddress(userDetails) || undefined,
    maskedAadhaar: uid.length >= 4 ? `XXXXXXXX${uid.slice(-4)}` : undefined,
    raw: nested
  };
};

export const verifyPan = async (input: {
  panNumber: string;
  name: string;
  dateOfBirth?: string;
}): Promise<EkoPanResult> => {
  if (config.ekoMock) {
    return {
      panNumber: input.panNumber,
      name: input.name || "Mock PAN Name",
      status: "VALID",
      nameMatch: "Y"
    };
  }

  const body: Record<string, unknown> = {
    initiator_id: config.ekoInitiatorId,
    pan_number: input.panNumber,
    name: input.name,
    dob: input.dateOfBirth || "1990-01-01",
    client_ref_id: newClientRefId()
  };
  if (config.ekoUserCode) {
    body.user_code = config.ekoUserCode;
  }

  const { data } = await callEkoKyc("/tools/kyc/pan-lite", body);
  const nested = (data.data || {}) as Record<string, any>;
  const panStatus = String(nested.status || nested.pan_status || "").toUpperCase();
  if (panStatus === "INVALID" || nested.pan_status === "N" || nested.pan_status === "F") {
    throw new Error("PAN is invalid according to Eko");
  }

  return {
    panNumber: String(nested.pan || input.panNumber),
    name: String(nested.name || input.name || "").trim() || undefined,
    status: panStatus || "VALID",
    nameMatch: nested.name_match != null ? String(nested.name_match) : undefined,
    dobMatch: nested.dob_match != null ? String(nested.dob_match) : undefined,
    raw: nested
  };
};

export const verifyGstin = async (input: {
  gstin: string;
  businessName?: string;
}): Promise<EkoGstResult> => {
  if (config.ekoMock) {
    return {
      gstin: input.gstin.toUpperCase(),
      valid: true,
      legalName: input.businessName || "Mock GST Business",
      status: "Active"
    };
  }

  const body: Record<string, unknown> = {
    initiator_id: config.ekoInitiatorId,
    gstin: input.gstin.toUpperCase(),
    client_ref_id: newClientRefId()
  };
  if (input.businessName) {
    body.business_name = input.businessName.slice(0, 100);
  }
  if (config.ekoUserCode) {
    body.user_code = config.ekoUserCode;
  }

  const { data } = await callEkoKyc("/tools/kyc/gstin", body);
  const nested = (data.data || {}) as Record<string, any>;
  const gstStatus = String(nested.gst_in_status || nested.gstin_status || nested.status || "").trim();
  const isValid =
    nested.valid === true ||
    (nested.valid !== false && Boolean(gstStatus) && !/cancel|invalid|suspend/i.test(gstStatus));

  if (nested.valid === false || /cancel|invalid/i.test(gstStatus)) {
    throw new Error("GSTIN is not valid according to government records");
  }

  return {
    gstin: String(nested.GSTIN || nested.gstin || input.gstin).toUpperCase(),
    valid: isValid,
    legalName: String(nested.legal_name_of_business || nested.legalName || "").trim() || undefined,
    tradeName: String(nested.trade_name || nested.tradeName || "").trim() || undefined,
    status: gstStatus || "Active",
    raw: nested
  };
};

export const verifyFssai = async (input: { fssaiNumber: string }): Promise<EkoFssaiResult> => {
  if (config.ekoMock) {
    return {
      fssaiNumber: input.fssaiNumber,
      valid: true,
      businessName: "Mock Food Business",
      licenseStatus: "Active"
    };
  }

  const body: Record<string, unknown> = {
    initiator_id: config.ekoInitiatorId,
    fssai: input.fssaiNumber.replace(/\D/g, ""),
    client_ref_id: newClientRefId()
  };
  if (config.ekoUserCode) {
    body.user_code = config.ekoUserCode;
  }

  const { data } = await callEkoKyc("/tools/kyc/touras/fetch-fssai", body);
  const nested = (data.data || {}) as Record<string, any>;
  const licenseStatus = String(
    nested.license_status || nested.status || nested.fbo_status || nested.license_category || ""
  ).trim();

  if (/cancel|suspend|expir|invalid/i.test(licenseStatus)) {
    throw new Error(`FSSAI license is not active (${licenseStatus || "invalid"})`);
  }

  return {
    fssaiNumber: String(nested.fssai_number || nested.fssai || input.fssaiNumber).replace(/\D/g, ""),
    valid: true,
    businessName: String(nested.fbo_name || nested.business_name || nested.company_name || nested.name || "").trim() ||
      undefined,
    licenseStatus: licenseStatus || "Active",
    expiryDate: String(nested.expiry_date || nested.valid_upto || "").trim() || undefined,
    raw: nested
  };
};

export const validateBankAccount = async (input: {
  accountNumber: string;
  ifsc: string;
  name?: string;
}): Promise<EkoBankResult> => {
  if (config.ekoMock) {
    return {
      accountStatus: "VALID",
      beneficiaryName: input.name || "Mock Account Holder",
      nameMatchResult: true,
      nameMatchScore: 100
    };
  }

  const body: Record<string, unknown> = {
    initiator_id: config.ekoInitiatorId,
    bank_account: input.accountNumber,
    ifsc: input.ifsc,
    client_ref_id: newClientRefId()
  };
  if (input.name) {
    body.name = input.name;
  }
  if (config.ekoUserCode) {
    body.user_code = config.ekoUserCode;
  }

  const { data } = await callEkoKyc("/tools/kyc/bank-account/sync", body);
  const nested = (data.data || {}) as Record<string, any>;
  const beneficiaryName = String(
    nested.beneficiary_name ||
      nested.beneficiaryName ||
      nested.account_holder_name ||
      nested.accountHolderName ||
      nested.name ||
      ""
  ).trim();

  const accountStatus = String(nested.account_status || nested.status || "").toUpperCase();
  const statusCode = String(nested.account_status_code || nested.accountStatusCode || "").toUpperCase();
  if (
    accountStatus === "INVALID" ||
    statusCode.includes("INVALID") ||
    statusCode.includes("FAIL")
  ) {
    throw new Error("Bank account could not be verified. Check account number and IFSC.");
  }

  return {
    accountStatus: accountStatus || "VALID",
    beneficiaryName: beneficiaryName || undefined,
    nameMatchScore:
      nested.name_match_score != null ? Number(nested.name_match_score) : undefined,
    nameMatchResult: nested.name_match ?? nested.nameMatchResult,
    raw: nested
  };
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
  return { status: response.status, data: parseJsonSafe(rawText), rawText, url };
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

  if (config.ekoMock) {
    return {
      ok: true,
      status: 200,
      url: "mock",
      contentType: "application/json",
      bodyPreview: "EKO_MOCK=true",
      diagnosis: "mock_mode"
    };
  }

  try {
    const result = await getSettlementBalance();
    const contentType = "application/json";
    const bodyPreview = result.rawText.replace(/\s+/g, " ").slice(0, 280);
    const diagnosis = diagnoseEkoResponse(result.status, contentType, bodyPreview);
    const businessOk = isEkoBusinessSuccess(result.data as EkoApiResponse);

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

/** Probe DigiLocker create (safe — does not complete KYC). */
export const probeEkoDigiLocker = async (): Promise<EkoProbeResult> => {
  if (!isEkoConfigured()) {
    return {
      ok: false,
      status: 0,
      url: "",
      contentType: "",
      bodyPreview: "Missing Eko credentials",
      diagnosis: "missing_credentials"
    };
  }
  if (config.ekoMock) {
    return {
      ok: true,
      status: 200,
      url: "mock",
      contentType: "application/json",
      bodyPreview: "EKO_MOCK=true",
      diagnosis: "mock_mode"
    };
  }

  const url = buildKycUrl("/tools/kyc/digilocker");
  try {
    const auth = buildEkoAuthHeaders();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...auth
      },
      body: JSON.stringify({
        initiator_id: config.ekoInitiatorId,
        redirect_url: config.ekoDigilockerRedirectUrl,
        document_requested: ["AADHAAR"],
        client_ref_id: newClientRefId()
      })
    });
    const rawText = await response.text();
    const data = parseJsonSafe(rawText);
    const bodyPreview = rawText.replace(/\s+/g, " ").slice(0, 280);
    const businessOk = isEkoBusinessSuccess(data);
    return {
      ok: response.status >= 200 && response.status < 300 && businessOk,
      status: response.status,
      url,
      contentType: response.headers.get("content-type") || "",
      bodyPreview,
      diagnosis: businessOk ? "api_reachable" : diagnoseEkoResponse(response.status, "application/json", bodyPreview),
      response: data
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      url,
      contentType: "",
      bodyPreview: String(error?.message || error).slice(0, 280),
      diagnosis: "network_or_timeout"
    };
  }
};
