import { randomBytes, randomUUID } from "crypto";
import { config } from "../config/env";

const CONSENT_PURPOSE = "NearU delivery rider KYC verification";
// DigiLocker requires purpose length > 20 and Aadhaar OTP required <= 50.

export type DecentroAadhaarOtpResult = {
  initiationTransactionId: string;
  decentroTxnId?: string;
  message: string;
};

export type DecentroAadhaarProfile = {
  name: string;
  dateOfBirth?: string;
  gender?: string;
  careOf?: string;
  address?: string;
  maskedAadhaar?: string;
  photo?: string;
  raw?: Record<string, unknown>;
};

export type DecentroPanResult = {
  panNumber: string;
  name?: string;
  status?: string;
  raw?: Record<string, unknown>;
};

export type DecentroBankResult = {
  accountStatus?: string;
  beneficiaryName?: string;
  nameMatchScore?: number;
  nameMatchResult?: boolean | string;
  transactionStatus?: string;
  raw?: Record<string, unknown>;
  usedAdminFallback?: boolean;
};

type DecentroApiResponse = {
  decentroTxnId?: string;
  decentro_txn_id?: string;
  status?: string;
  responseCode?: string;
  response_code?: string;
  message?: string;
  responseKey?: string;
  response_key?: string;
  data?: Record<string, any>;
  [key: string]: unknown;
};

const newReferenceId = () => randomUUID().replace(/-/g, "").slice(0, 32);

const isSuccessStatus = (payload: DecentroApiResponse) => {
  const status = String(payload.status || "").toUpperCase();
  const code = String(payload.responseCode || payload.response_code || "").toUpperCase();
  return status === "SUCCESS" || code.startsWith("S") || payload.responseKey?.startsWith("success");
};

const extractMessage = (payload: DecentroApiResponse, fallback: string) =>
  String(payload.message || payload.responseKey || payload.response_key || fallback);

const buildHeaders = (module: "kyc" | "payments" | "core_banking") => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    client_id: config.decentroClientId.trim(),
    client_secret: config.decentroClientSecret.trim()
  };

  if (module === "kyc" && config.decentroKycModuleSecret) {
    headers.module_secret = config.decentroKycModuleSecret.trim();
  }
  if (module === "payments" && config.decentroPaymentsModuleSecret) {
    headers.module_secret = config.decentroPaymentsModuleSecret.trim();
  }
  if (module === "core_banking" && config.decentroCoreBankingModuleSecret) {
    headers.module_secret = config.decentroCoreBankingModuleSecret.trim();
  }
  // YBL provider_secret is only for banking rails — never attach it to KYC calls.
  if ((module === "payments" || module === "core_banking") && config.decentroProviderSecret) {
    headers.provider_secret = config.decentroProviderSecret.trim();
  }

  return headers;
};

const getDecentroHost = (baseUrl: string) => {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
};

const isProductionDecentroHost = (baseUrl: string) => getDecentroHost(baseUrl) === "in.decentro.tech";

const resolveDecentroBaseUrl = () => {
  const configured = config.decentroBaseUrl.replace(/\/$/, "");
  // Current Vyaha credentials authenticate on staging only.
  if (isProductionDecentroHost(configured)) {
    console.warn(
      `[decentro] DECENTRO_BASE_URL is production (${configured}). Forcing https://in.staging.decentro.tech because current keys are staging-only.`
    );
    return "https://in.staging.decentro.tech";
  }
  return configured;
};

const callDecentro = async (
  path: string,
  body: Record<string, unknown>,
  module: "kyc" | "payments" | "core_banking"
): Promise<DecentroApiResponse> => {
  if (!config.decentroClientId || !config.decentroClientSecret) {
    throw new Error("Decentro credentials are not configured on the server");
  }

  if (module === "kyc" && !config.decentroKycModuleSecret && !config.decentroMock) {
    throw new Error(
      "DECENTRO_KYC_MODULE_SECRET is missing on the server. Add the KYC & Onboarding module secret to backend/.env and redeploy the VPS."
    );
  }

  const baseUrl = resolveDecentroBaseUrl();
  const url = `${baseUrl}${path}`;
  const host = getDecentroHost(baseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(module),
    body: JSON.stringify(body)
  });

  const rawText = await response.text();
  let payload: DecentroApiResponse = {};
  try {
    payload = rawText ? (JSON.parse(rawText) as DecentroApiResponse) : {};
  } catch {
    const hint =
      response.status === 403 || response.status === 401
        ? ` Auth failed on host ${host}. Set DECENTRO_BASE_URL=https://in.staging.decentro.tech on the VPS backend/.env.`
        : "";
    const snippet = rawText.replace(/\s+/g, " ").slice(0, 120);
    throw new Error(
      `Decentro non-JSON (${response.status}) host=${host}.${hint}${snippet ? ` Body: ${snippet}` : ""}`
    );
  }

  if (!response.ok || !isSuccessStatus(payload)) {
    throw new Error(
      `${extractMessage(payload, `Decentro request failed (${response.status})`)} [host=${host}]`
    );
  }

  return payload;
};

export const getDecentroRuntimeConfig = () => ({
  configuredBaseUrl: config.decentroBaseUrl,
  configuredHost: getDecentroHost(config.decentroBaseUrl),
  effectiveBaseUrl: resolveDecentroBaseUrl(),
  effectiveHost: getDecentroHost(resolveDecentroBaseUrl()),
  clientIdPrefix: config.decentroClientId ? `${config.decentroClientId.slice(0, 12)}…` : "",
  hasClientSecret: Boolean(config.decentroClientSecret),
  hasKycModuleSecret: Boolean(config.decentroKycModuleSecret),
  hasPaymentsModuleSecret: Boolean(config.decentroPaymentsModuleSecret),
  hasConsumerUrn: Boolean(config.decentroConsumerUrn),
  mock: config.decentroMock,
  bankValidationType: config.decentroBankValidationType,
  digilockerRedirectUrl: config.decentroDigilockerRedirectUrl
});

/** Safe live probe from this server (used to detect VPS/IP blocks vs bad keys). */
export const probeDecentroAadhaarEndpoint = async () => {
  const baseUrl = resolveDecentroBaseUrl();
  const host = getDecentroHost(baseUrl);
  if (!config.decentroClientId || !config.decentroClientSecret || !config.decentroKycModuleSecret) {
    return {
      ok: false,
      host,
      status: 0,
      contentType: "",
      bodyPreview: "Missing Decentro credentials on server",
      diagnosis: "missing_credentials"
    };
  }

  const response = await fetch(`${baseUrl}/v2/kyc/sso/digilocker/session`, {
    method: "POST",
    headers: buildHeaders("kyc"),
    body: JSON.stringify({
      reference_id: newReferenceId(),
      consent: true,
      consent_purpose: CONSENT_PURPOSE,
      purpose: CONSENT_PURPOSE,
      redirect_url: config.decentroDigilockerRedirectUrl,
      redirect_to_signup: true,
      pinless_signin: true,
      pinless_signup: false,
      usernameless_signup: false,
      clear_cookies: true,
      documents_for_consent: ["ADHAR"]
    })
  });

  const rawText = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const bodyPreview = rawText.replace(/\s+/g, " ").slice(0, 220);
  let diagnosis = "unknown";
  if (response.status === 403 && bodyPreview.includes("403 Forbidden")) {
    diagnosis = "ip_or_waf_blocked";
  } else if (response.status === 401) {
    diagnosis = "invalid_credentials";
  } else if (contentType.includes("application/json")) {
    diagnosis = "api_reachable";
  }

  return {
    ok: contentType.includes("application/json"),
    host,
    status: response.status,
    contentType,
    bodyPreview,
    diagnosis,
    endpoint: "digilocker/session"
  };
};

const pickName = (data: Record<string, any> | undefined) => {
  if (!data) return "";
  const proof = data.proofOfIdentity || data.proof_of_identity || {};
  const candidates = [
    data.name,
    data.full_name,
    data.fullName,
    data.aadhaarName,
    proof.name,
    proof.full_name,
    data.pan_name,
    data.registered_name,
    data.accountHolderName,
    data.beneficiaryName,
    data.beneficiary_name
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const formatAddress = (data: Record<string, any> | undefined) => {
  if (!data) return "";
  const proof = data.proofOfAddress || data.proof_of_address || data.address || {};
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

export const isDecentroConfigured = () =>
  Boolean(config.decentroClientId && config.decentroClientSecret) || config.decentroMock;

export const generateAadhaarShareCode = () => String(Math.floor(1000 + Math.random() * 9000));

export type DigiLockerSessionResult = {
  initiationTransactionId: string;
  authorizationUrl: string;
  message: string;
};

export const initiateDigiLockerSession = async (redirectUrl?: string): Promise<DigiLockerSessionResult> => {
  if (config.decentroMock) {
    return {
      initiationTransactionId: `MOCK-DIGILOCKER-${Date.now()}`,
      authorizationUrl: "",
      message: "Mock DigiLocker ready. Tap Continue after DigiLocker to complete."
    };
  }

  const payload = await callDecentro(
    "/v2/kyc/sso/digilocker/session",
    {
      reference_id: newReferenceId(),
      consent: true,
      consent_purpose: CONSENT_PURPOSE,
      purpose: CONSENT_PURPOSE,
      redirect_url: redirectUrl || config.decentroDigilockerRedirectUrl,
      redirect_to_signup: true,
      pinless_signin: true,
      pinless_signup: false,
      usernameless_signup: false,
      clear_cookies: true,
      documents_for_consent: ["ADHAR"]
    },
    "kyc"
  );

  const initiationTransactionId = String(
    payload.decentroTxnId || payload.decentro_txn_id || payload.data?.decentroTxnId || ""
  );
  const authorizationUrl = String(
    payload.data?.authorizationUrl ||
      payload.data?.authorization_url ||
      payload.data?.digilockerUrl ||
      payload.data?.digilocker_url ||
      payload.data?.url ||
      ""
  );

  if (!initiationTransactionId) {
    throw new Error("Decentro DigiLocker did not return a transaction id");
  }
  if (!authorizationUrl) {
    throw new Error("Decentro DigiLocker did not return an authorization URL");
  }

  return {
    initiationTransactionId,
    authorizationUrl,
    message: extractMessage(payload, "Open DigiLocker to share e-Aadhaar")
  };
};

export const exchangeDigiLockerAccessToken = async (input: {
  initiationTransactionId: string;
  code: string;
}): Promise<void> => {
  if (config.decentroMock) return;

  await callDecentro(
    `/v2/kyc/sso/digilocker/${encodeURIComponent(input.initiationTransactionId)}/token`,
    {
      reference_id: newReferenceId(),
      consent: true,
      consent_purpose: CONSENT_PURPOSE,
      purpose: CONSENT_PURPOSE,
      code: input.code
    },
    "kyc"
  );
};

const parseAadhaarProfileFromDigiLocker = (data: Record<string, any>): DecentroAadhaarProfile => {
  const nested =
    data.aadhaarData ||
    data.aadhaar_data ||
    data.eaadhaar ||
    data.eAadhaar ||
    data.proofOfIdentity ||
    data.proof_of_identity ||
    data;

  const name = pickName(data) || pickName(nested);
  if (!name) {
    throw new Error("DigiLocker e-Aadhaar returned no name");
  }

  const uid = String(
    nested.uid || nested.aadhaarNumber || nested.aadhaar_number || data.uid || data.maskedAadhaar || ""
  ).replace(/\D/g, "");

  return {
    name,
    dateOfBirth: String(nested.dob || nested.dateOfBirth || data.dob || "").slice(0, 10) || undefined,
    gender: String(nested.gender || data.gender || "").trim() || undefined,
    careOf: String(nested.careOf || nested.care_of || "").trim() || undefined,
    address: formatAddress(data) || formatAddress(nested) || undefined,
    maskedAadhaar: uid.length >= 4 ? `XXXXXXXX${uid.slice(-4)}` : undefined,
    photo: typeof nested.photo === "string" ? nested.photo : undefined,
    raw: data
  };
};

export const fetchDigiLockerEAadhaar = async (input: {
  initiationTransactionId: string;
  code?: string;
}): Promise<DecentroAadhaarProfile> => {
  if (config.decentroMock) {
    return {
      name: "Mock DigiLocker Rider",
      dateOfBirth: "1995-01-15",
      gender: "M",
      address: "Hyderabad, Telangana, 500001",
      maskedAadhaar: "XXXXXXXX1234"
    };
  }

  if (input.code) {
    try {
      await exchangeDigiLockerAccessToken({
        initiationTransactionId: input.initiationTransactionId,
        code: input.code
      });
    } catch (error) {
      // Some DigiLocker sessions already have a token after redirect; continue to eAadhaar.
      console.warn("[decentro] DigiLocker token exchange skipped/failed:", (error as Error)?.message);
    }
  }

  const payload = await callDecentro(
    `/v2/kyc/sso/digilocker/${encodeURIComponent(input.initiationTransactionId)}/eaadhaar`,
    {
      reference_id: newReferenceId(),
      consent: true,
      consent_purpose: CONSENT_PURPOSE,
      purpose: CONSENT_PURPOSE,
      generate_xml: false,
      generate_pdf: false
    },
    "kyc"
  );

  return parseAadhaarProfileFromDigiLocker((payload.data || {}) as Record<string, any>);
};

/** @deprecated Decentro Aadhaar OTP is deprecated — use DigiLocker. Kept for mock/legacy. */
export const sendAadhaarOtp = async (aadhaarNumber: string): Promise<DecentroAadhaarOtpResult> => {
  if (config.decentroMock) {
    return {
      initiationTransactionId: `MOCK-AADHAAR-${aadhaarNumber.slice(-4)}-${Date.now()}`,
      message: "Mock Aadhaar OTP sent. Use OTP 111111 in sandbox mock mode."
    };
  }

  throw new Error(
    "Aadhaar OTP is deprecated by Decentro. Use DigiLocker verification instead."
  );
};

/** @deprecated Decentro Aadhaar OTP is deprecated — use DigiLocker. */
export const validateAadhaarOtp = async (input: {
  initiationTransactionId: string;
  otp: string;
  shareCode: string;
}): Promise<DecentroAadhaarProfile> => {
  if (config.decentroMock) {
    if (input.otp !== "111111") {
      throw new Error("Invalid OTP. In mock mode use 111111.");
    }
    return {
      name: "Mock Delivery Rider",
      dateOfBirth: "1995-01-15",
      gender: "M",
      address: "Hyderabad, Telangana, 500001",
      maskedAadhaar: `XXXXXXXX${input.initiationTransactionId.replace(/\D/g, "").slice(-4) || "0000"}`
    };
  }

  throw new Error(
    "Aadhaar OTP is deprecated by Decentro. Use DigiLocker verification instead."
  );
};

export const verifyPan = async (panNumber: string): Promise<DecentroPanResult> => {
  if (config.decentroMock) {
    return {
      panNumber,
      name: "Mock Delivery Rider",
      status: "VALID"
    };
  }

  const payload = await callDecentro(
    "/kyc/public_registry/validate",
    {
      reference_id: newReferenceId(),
      document_type: "PAN",
      id_number: panNumber,
      consent: "Y",
      consent_purpose: CONSENT_PURPOSE
    },
    "kyc"
  );

  const data = (payload.data || {}) as Record<string, any>;
  return {
    panNumber,
    name: pickName(data) || undefined,
    status: String(data.status || data.idStatus || data.id_status || "VALID"),
    raw: data
  };
};

export const validateBankAccount = async (input: {
  accountNumber: string;
  ifsc: string;
  name?: string;
}): Promise<DecentroBankResult> => {
  if (config.decentroMock) {
    return {
      accountStatus: "VALID",
      beneficiaryName: input.name || "Mock Delivery Rider",
      nameMatchResult: true,
      nameMatchScore: 1,
      transactionStatus: "success"
    };
  }

  if (!config.decentroConsumerUrn) {
    throw new Error("Decentro consumer URN is not configured");
  }

  const body: Record<string, unknown> = {
    reference_id: newReferenceId(),
    purpose_message: "Rider payout bank verification",
    consumer_urn: config.decentroConsumerUrn,
    validation_type: config.decentroBankValidationType,
    beneficiary_details: {
      account_number: input.accountNumber,
      ifsc: input.ifsc.toUpperCase()
    }
  };

  if (input.name) {
    body.perform_name_match = true;
    body.name = input.name;
    (body.beneficiary_details as Record<string, string>).name = input.name;
  }

  const payload = await callDecentro(
    "/v3/banking/money_transfer/validate_bank_account",
    body,
    "payments"
  );

  const data = (payload.data || {}) as Record<string, any>;
  const beneficiaryName = pickName(data) || String(data.beneficiaryName || data.beneficiary_name || "").trim();
  const accountStatus = String(data.accountStatus || data.account_status || data.status || "").toUpperCase();
  const transactionStatus = String(data.transactionStatus || data.transaction_status || "").toLowerCase();

  const invalid =
    accountStatus.includes("INVALID") ||
    accountStatus.includes("FAILED") ||
    transactionStatus === "failure" ||
    transactionStatus === "failed";

  if (invalid) {
    throw new Error(extractMessage(payload, "Bank account validation failed"));
  }

  return {
    accountStatus: accountStatus || "VALID",
    beneficiaryName: beneficiaryName || undefined,
    nameMatchScore:
      typeof data.nameMatchScore === "number"
        ? data.nameMatchScore
        : typeof data.name_match_score === "number"
          ? data.name_match_score
          : undefined,
    nameMatchResult: data.nameMatchResult ?? data.name_match_result,
    transactionStatus: transactionStatus || undefined,
    raw: data
  };
};

export const maskAadhaarNumber = (aadhaarNumber: string) => {
  const digits = aadhaarNumber.replace(/\D/g, "");
  if (digits.length !== 12) return aadhaarNumber;
  return `XXXXXXXX${digits.slice(-4)}`;
};

export const createEphemeralShareCode = () => {
  const bytes = randomBytes(2);
  return String(1000 + (bytes.readUInt16BE(0) % 9000));
};
