import { config } from "../config/env";
import OtpSession from "../models/OtpSession.model";
import {
  buildOtpDebugPayload,
  finishOtpSendTrace,
  getLastOtpSendTrace,
  recordOtpAttempt,
  startOtpSendTrace
} from "../utils/otpDebug";

type OtpProvider = "twilio" | "2factor" | "memory";

export type OtpSendResult = {
  provider: "2factor" | "memory";
  deliveryHint?: string;
  /** Sanitized proof of the exact 2Factor path (never includes the API key). */
  apiPath?: string;
  deliveryChannel?: "sms";
};

type OtpRecord = {
  otp: string;
  expiresAt: number;
  attempts: number;
  resendAllowedAt: number;
};

type TwoFactorResponse = {
  Status?: string;
  Details?: string;
  status?: string;
  details?: string;
};

const memoryRecords = new Map<string, OtpRecord>();

const getProvider = (): OtpProvider => {
  if (config.otpProvider === "twilio" || config.otpProvider === "2factor") {
    return config.otpProvider;
  }

  return "memory";
};

const parseTwoFactorResponse = (payload: TwoFactorResponse) => {
  const status = String(payload.Status || payload.status || "").trim();
  const details = String(payload.Details || payload.details || "").trim();
  return { status, details };
};

const isTwoFactorSuccess = (payload: TwoFactorResponse) => {
  const { status } = parseTwoFactorResponse(payload);
  return status.toLowerCase() === "success";
};

const persistAutogenSession = async (phone: string, sessionId: string) => {
  const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);
  await OtpSession.deleteMany({ phone });
  await OtpSession.create({
    phone,
    sessionId,
    manualOtp: "",
    attempts: 0,
    expiresAt
  });
};

const markResendCooldown = (phone: string) => {
  const now = Date.now();
  memoryRecords.set(phone, {
    otp: "",
    attempts: 0,
    expiresAt: now + config.otpExpiryMinutes * 60 * 1000,
    resendAllowedAt: now + config.otpResendCooldownSeconds * 1000
  });
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

/** 2Factor expects ISD format without +: 91XXXXXXXXXX */
const toTwoFactorPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  const local10 = digits.slice(-10);
  return `91${local10}`;
};

const buildOtpSmsAutogenPath = (phoneWithCountry: string, templateName: string) =>
  `/API/V1/{api_key}/SMS/${phoneWithCountry}/AUTOGEN/${templateName}`;

/**
 * Official 2Factor OTP SMS API only (NOT transactional R1, NOT voice):
 * GET /API/V1/{api_key}/SMS/91XXXXXXXXXX/AUTOGEN/{template_name}
 *
 * Do not use:
 * - https://2factor.in/API/R1/?module=TRANS_SMS  (transactional SMS)
 * - https://2factor.in/API/V1/.../VOICE/...       (voice OTP)
 */
const sendOtpSmsAutogen = async (phone: string, apiKey: string) => {
  const channel = config.twofactorOtpChannel;
  if (channel !== "sms") {
    throw new Error(`2Factor OTP channel must be sms (got "${channel}")`);
  }

  const phoneWithCountry = toTwoFactorPhone(phone);
  const templateName = encodeURIComponent(config.twofactorTemplateName);
  const apiPath = buildOtpSmsAutogenPath(phoneWithCountry, config.twofactorTemplateName);
  const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phoneWithCountry}/AUTOGEN/${templateName}`;

  console.log(`[OTP] calling 2Factor OTP SMS (not TRANS_SMS/R1, not VOICE): ${apiPath}`);

  const response = await fetch(url, { method: "GET" });
  const payload = (await response.json()) as TwoFactorResponse;
  const { details } = parseTwoFactorResponse(payload);

  if (!response.ok || !isTwoFactorSuccess(payload) || !details) {
    throw new Error(`2Factor OTP SMS AUTOGEN failed: ${JSON.stringify(payload)}`);
  }

  return { sessionId: details, apiPath, phoneWithCountry };
};

const sendVia2Factor = async (phone: string): Promise<OtpSendResult> => {
  const trace = startOtpSendTrace(phone, "2factor");
  const apiKey = config.twofactorApiKey;
  if (!apiKey) {
    const message = "2Factor API key is not configured";
    recordOtpAttempt(trace, { label: "CONFIG", ok: false, detail: message });
    finishOtpSendTrace(trace, "failed", message);
    throw new Error(message);
  }

  if (!config.twofactorSenderId || !config.twofactorTemplateName) {
    const message = "2Factor sender ID and OTP template name must be configured";
    recordOtpAttempt(trace, { label: "CONFIG", ok: false, detail: message });
    finishOtpSendTrace(trace, "failed", message);
    throw new Error(message);
  }

  try {
    const { sessionId, apiPath, phoneWithCountry } = await sendOtpSmsAutogen(phone, apiKey);
    await persistAutogenSession(phone, sessionId);
    markResendCooldown(phone);
    recordOtpAttempt(trace, {
      label: "OTP_SMS_AUTOGEN",
      ok: true,
      detail: `channel=sms to=${phoneWithCountry} template=${config.twofactorTemplateName} path=${apiPath}`
    });
    finishOtpSendTrace(trace, "sent");
    return {
      provider: "2factor",
      deliveryChannel: "sms",
      apiPath,
      deliveryHint: `OTP sent via SMS from ${config.twofactorSenderId}.`
    };
  } catch (error: any) {
    const lastError = error instanceof Error ? error : new Error(String(error));
    recordOtpAttempt(trace, { label: "OTP_SMS_AUTOGEN", ok: false, detail: lastError.message });
    finishOtpSendTrace(trace, "failed", lastError.message);
    throw lastError;
  }
};

const verifyTwoFactorSession = async (apiKey: string, sessionId: string, otp: string) => {
  const response = await fetch(`https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${sessionId}/${otp}`, {
    method: "GET"
  });
  const payload = (await response.json()) as TwoFactorResponse;
  return response.ok && isTwoFactorSuccess(payload);
};

const verifyVia2Factor = async (phone: string, otp: string) => {
  const record = await OtpSession.findOne({
    phone,
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!record) {
    return false;
  }

  if (record.attempts >= config.otpMaxAttempts) {
    await OtpSession.deleteMany({ phone });
    return false;
  }

  await OtpSession.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });

  if (record.manualOtp) {
    const verified = record.manualOtp === otp;
    if (verified) {
      await OtpSession.deleteMany({ phone });
    }
    return verified;
  }

  if (!record.sessionId) {
    return false;
  }

  const verified = await verifyTwoFactorSession(config.twofactorApiKey, record.sessionId, otp);
  if (verified) {
    await OtpSession.deleteMany({ phone });
  }

  return verified;
};

const createMemoryRecord = (phone: string) => {
  const otp = generateOtp();
  const now = Date.now();

  memoryRecords.set(phone, {
    otp,
    attempts: 0,
    expiresAt: now + config.otpExpiryMinutes * 60 * 1000,
    resendAllowedAt: now + config.otpResendCooldownSeconds * 1000
  });

  if (!config.isProduction) {
    console.log(`[OTP:memory] ${phone} -> ${otp}`);
  }
};

const assertResendAllowed = async (phone: string) => {
  const memoryRecord = memoryRecords.get(phone);
  if (memoryRecord && memoryRecord.resendAllowedAt > Date.now()) {
    const waitSeconds = Math.ceil((memoryRecord.resendAllowedAt - Date.now()) / 1000);
    throw new Error(`OTP resend available in ${waitSeconds}s`);
  }

  const persisted = await OtpSession.findOne({ phone }).sort({ createdAt: -1 }).lean();
  if (persisted?.createdAt) {
    const resendAllowedAt = new Date(persisted.createdAt).getTime() + config.otpResendCooldownSeconds * 1000;
    if (resendAllowedAt > Date.now()) {
      const waitSeconds = Math.ceil((resendAllowedAt - Date.now()) / 1000);
      throw new Error(`OTP resend available in ${waitSeconds}s`);
    }
  }
};

const sendViaTwilioVerify = async (phone: string) => {
  const auth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64");
  const body = new URLSearchParams({ To: `+91${phone}`, Channel: "sms" });

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${config.twilioVerifyServiceSid}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Twilio verify send failed: ${details}`);
  }
};

const verifyViaTwilioVerify = async (phone: string, otp: string) => {
  const auth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64");
  const body = new URLSearchParams({ To: `+91${phone}`, Code: otp });

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${config.twilioVerifyServiceSid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Twilio verify check failed: ${details}`);
  }

  const payload = (await response.json()) as { status?: string };
  return payload.status === "approved";
};

export class OTPService {
  static getLastSendDebug() {
    return buildOtpDebugPayload(getLastOtpSendTrace());
  }

  static async sendOTP(phone: string): Promise<OtpSendResult | void> {
    await assertResendAllowed(phone);
    const provider = getProvider();

    if (provider === "2factor") {
      return sendVia2Factor(phone);
    }

    if (provider === "twilio") {
      await sendViaTwilioVerify(phone);
      createMemoryRecord(phone);
      return;
    }

    if (config.isProduction) {
      throw new Error("OTP provider is not configured for production");
    }

    createMemoryRecord(phone);
    return { provider: "memory" };
  }

  static getDevOtp(phone: string): string | null {
    if (config.isProduction) {
      return null;
    }

    return memoryRecords.get(phone)?.otp || null;
  }

  static async verifyOTP(phone: string, otp: string): Promise<boolean> {
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    const testOtp = config.testLoginCredentials[normalizedPhone];
    if (testOtp && otp === testOtp) {
      return true;
    }

    const provider = getProvider();

    if (provider === "2factor") {
      return verifyVia2Factor(phone, otp);
    }

    if (provider === "twilio") {
      return verifyViaTwilioVerify(phone, otp);
    }

    const record = memoryRecords.get(phone);
    if (!record) {
      return false;
    }

    if (Date.now() > record.expiresAt) {
      memoryRecords.delete(phone);
      return false;
    }

    if (record.attempts >= config.otpMaxAttempts) {
      memoryRecords.delete(phone);
      return false;
    }

    record.attempts += 1;
    if (record.otp !== otp) {
      memoryRecords.set(phone, record);
      return false;
    }

    memoryRecords.delete(phone);
    return true;
  }
}
