import { config } from "../config/env";

type OtpProvider = "twilio" | "msg91" | "2factor" | "memory";
type TwoFactorChannel = "sms" | "voice";

export type OtpSendResult = {
  provider: "2factor" | "memory";
  channel?: TwoFactorChannel;
  deliveryHint?: string;
};

type OtpRecord = {
  otp: string;
  sessionId?: string;
  twoFactorApiKey?: string;
  twoFactorChannel?: TwoFactorChannel;
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

const records = new Map<string, OtpRecord>();

const getProvider = (): OtpProvider => {
  if (config.otpProvider === "twilio" || config.otpProvider === "msg91" || config.otpProvider === "2factor") {
    return config.otpProvider;
  }

  return "memory";
};

const getTwoFactorChannel = (): TwoFactorChannel => {
  if (config.twofactorOtpChannel === "voice") {
    return "voice";
  }
  return "sms";
};

const getTwoFactorApiKey = (channel: TwoFactorChannel) => {
  if (channel === "voice" && config.twofactorVoiceApiKey) {
    return config.twofactorVoiceApiKey;
  }
  return config.twofactorApiKey;
};

const parseTwoFactorResponse = (payload: TwoFactorResponse) => {
  const status = String(payload.Status || payload.status || "").trim();
  const details = String(payload.Details || payload.details || "").trim();
  return { status, details };
};

const sendVia2Factor = async (phone: string): Promise<OtpSendResult> => {
  const channel = getTwoFactorChannel();
  const apiKey = getTwoFactorApiKey(channel);

  if (!apiKey) {
    throw new Error("2Factor API key is not configured");
  }

  const templateName = encodeURIComponent(config.twofactorTemplateName);
  const url =
    channel === "voice"
      ? `https://2factor.in/API/V1/${apiKey}/VOICE/${phone}/AUTOGEN`
      : `https://2factor.in/API/V1/${apiKey}/SMS/${phone}/AUTOGEN/${templateName}`;

  const response = await fetch(url, { method: "GET" });
  const payload = (await response.json()) as TwoFactorResponse;
  const { status, details } = parseTwoFactorResponse(payload);

  if (!response.ok || status.toLowerCase() !== "success" || !details) {
    throw new Error(`2Factor ${channel} send failed: ${JSON.stringify(payload)}`);
  }

  const now = Date.now();
  records.set(phone, {
    otp: "",
    sessionId: details,
    twoFactorApiKey: apiKey,
    twoFactorChannel: channel,
    attempts: 0,
    expiresAt: now + config.otpExpiryMinutes * 60 * 1000,
    resendAllowedAt: now + config.otpResendCooldownSeconds * 1000
  });

  return {
    provider: "2factor",
    channel,
    deliveryHint:
      channel === "voice"
        ? "You will receive a phone call with your OTP."
        : "OTP sent via SMS from VYAHA."
  };
};

const verifyVia2Factor = async (phone: string, otp: string) => {
  const record = records.get(phone);
  if (!record?.sessionId || !record.twoFactorApiKey) {
    return false;
  }

  if (Date.now() > record.expiresAt) {
    records.delete(phone);
    return false;
  }

  if (record.attempts >= config.otpMaxAttempts) {
    records.delete(phone);
    return false;
  }

  record.attempts += 1;
  records.set(phone, record);

  const verifyPath =
    record.twoFactorChannel === "voice"
      ? `VOICE/VERIFY/${record.sessionId}/${otp}`
      : `SMS/VERIFY/${record.sessionId}/${otp}`;
  const response = await fetch(`https://2factor.in/API/V1/${record.twoFactorApiKey}/${verifyPath}`, {
    method: "GET"
  });
  const payload = (await response.json()) as TwoFactorResponse;
  const { status } = parseTwoFactorResponse(payload);
  const verified = response.ok && status.toLowerCase() === "success";

  if (verified) {
    records.delete(phone);
  }

  return verified;
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const createMemoryRecord = (phone: string) => {
  const otp = generateOtp();
  const now = Date.now();

  records.set(phone, {
    otp,
    attempts: 0,
    expiresAt: now + config.otpExpiryMinutes * 60 * 1000,
    resendAllowedAt: now + config.otpResendCooldownSeconds * 1000
  });

  if (!config.isProduction) {
    console.log(`[OTP:memory] ${phone} -> ${otp}`);
  }
};

const assertResendAllowed = (phone: string) => {
  const record = records.get(phone);
  if (record && record.resendAllowedAt > Date.now()) {
    const waitSeconds = Math.ceil((record.resendAllowedAt - Date.now()) / 1000);
    throw new Error(`OTP resend available in ${waitSeconds}s`);
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

const sendViaMsg91 = async (phone: string) => {
  const response = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      authkey: config.msg91AuthKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mobile: `91${phone}`,
      template_id: config.msg91TemplateId,
      authkey: config.msg91AuthKey,
      sender: config.msg91SenderId
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`MSG91 send failed: ${details}`);
  }
};

const verifyViaMsg91 = async (phone: string, otp: string) => {
  const params = new URLSearchParams({
    authkey: config.msg91AuthKey,
    mobile: `91${phone}`,
    otp
  });

  const response = await fetch(`https://control.msg91.com/api/v5/otp/verify?${params.toString()}`);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`MSG91 verify failed: ${details}`);
  }

  const payload = (await response.json()) as { type?: string; message?: string };
  return payload.type === "success" || Boolean(payload.message?.toLowerCase().includes("verified"));
};

export class OTPService {
  static async sendOTP(phone: string): Promise<OtpSendResult | void> {
    assertResendAllowed(phone);
    const provider = getProvider();

    if (provider === "2factor") {
      return sendVia2Factor(phone);
    }

    if (provider === "twilio") {
      await sendViaTwilioVerify(phone);
      createMemoryRecord(phone);
      return;
    }

    if (provider === "msg91") {
      await sendViaMsg91(phone);
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

    return records.get(phone)?.otp || null;
  }

  static async verifyOTP(phone: string, otp: string): Promise<boolean> {
    const provider = getProvider();

    if (provider === "2factor") {
      return verifyVia2Factor(phone, otp);
    }

    if (provider === "twilio") {
      return verifyViaTwilioVerify(phone, otp);
    }

    if (provider === "msg91") {
      return verifyViaMsg91(phone, otp);
    }

    const record = records.get(phone);
    if (!record) {
      return false;
    }

    if (Date.now() > record.expiresAt) {
      records.delete(phone);
      return false;
    }

    if (record.attempts >= config.otpMaxAttempts) {
      records.delete(phone);
      return false;
    }

    record.attempts += 1;
    if (record.otp !== otp) {
      records.set(phone, record);
      return false;
    }

    records.delete(phone);
    return true;
  }
}
