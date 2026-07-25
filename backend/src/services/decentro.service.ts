import { randomBytes, randomUUID } from "crypto";
import { config } from "../config/env";

const CONSENT_PURPOSE = "Delivery partner KYC verification for NearU payouts";

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
      "DECENTRO_KYC_MODULE_SECRET is missing on the server. Add the KYC & Onboarding module secret in Render env vars and redeploy."
    );
  }

  const url = `${config.decentroBaseUrl.replace(/\/$/, "")}${path}`;
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
        ? " Auth failed — check DECENTRO_BASE_URL matches your credentials (staging keys → in.staging.decentro.tech, production keys → in.decentro.tech), and that client_id / client_secret / module_secret are set on Render."
        : "";
    const snippet = rawText.replace(/\s+/g, " ").slice(0, 120);
    throw new Error(
      `Decentro returned a non-JSON response (${response.status}).${hint}${snippet ? ` Body: ${snippet}` : ""}`
    );
  }

  if (!response.ok || !isSuccessStatus(payload)) {
    throw new Error(extractMessage(payload, `Decentro request failed (${response.status})`));
  }

  return payload;
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

export const sendAadhaarOtp = async (aadhaarNumber: string): Promise<DecentroAadhaarOtpResult> => {
  if (config.decentroMock) {
    return {
      initiationTransactionId: `MOCK-AADHAAR-${aadhaarNumber.slice(-4)}-${Date.now()}`,
      message: "Mock Aadhaar OTP sent. Use OTP 111111 in sandbox mock mode."
    };
  }

  const payload = await callDecentro(
    "/v2/kyc/aadhaar/otp",
    {
      reference_id: newReferenceId(),
      consent: true,
      purpose: CONSENT_PURPOSE,
      aadhaar_number: aadhaarNumber
    },
    "kyc"
  );

  const initiationTransactionId = String(
    payload.decentroTxnId ||
      payload.decentro_txn_id ||
      payload.data?.initiationTransactionId ||
      payload.data?.initiation_transaction_id ||
      ""
  );

  if (!initiationTransactionId) {
    throw new Error("Decentro did not return an initiation transaction id");
  }

  return {
    initiationTransactionId,
    decentroTxnId: initiationTransactionId,
    message: extractMessage(payload, "Aadhaar OTP sent successfully")
  };
};

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

  const payload = await callDecentro(
    "/v2/kyc/aadhaar/otp/validate",
    {
      reference_id: newReferenceId(),
      consent: true,
      purpose: CONSENT_PURPOSE,
      initiation_transaction_id: input.initiationTransactionId,
      otp: input.otp,
      share_code: input.shareCode,
      generate_pdf: false,
      generate_xml: false
    },
    "kyc"
  );

  const data = (payload.data || {}) as Record<string, any>;
  const name = pickName(data);
  if (!name) {
    throw new Error("Aadhaar verified but name was not returned by Decentro");
  }

  const proof = data.proofOfIdentity || data.proof_of_identity || {};
  return {
    name,
    dateOfBirth: String(proof.dob || proof.dateOfBirth || data.dob || data.dateOfBirth || "").slice(0, 10) || undefined,
    gender: String(proof.gender || data.gender || "").trim() || undefined,
    careOf: String(proof.careOf || proof.care_of || data.careOf || "").trim() || undefined,
    address: formatAddress(data) || undefined,
    maskedAadhaar: String(data.maskedAadhaar || data.masked_aadhaar || "").trim() || undefined,
    photo: typeof data.photo === "string" ? data.photo : undefined,
    raw: data
  };
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
