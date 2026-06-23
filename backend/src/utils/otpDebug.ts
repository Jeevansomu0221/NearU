import { randomBytes } from "crypto";

export type OtpAttemptTrace = {
  label: string;
  ok: boolean;
  detail: string;
};

export type OtpSendTrace = {
  traceId: string;
  phoneMasked: string;
  provider: string;
  attempts: OtpAttemptTrace[];
  startedAt: string;
  finishedAt: string;
  outcome: "sent" | "failed";
  error?: string;
};

let lastSendTrace: OtpSendTrace | null = null;

export const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) {
    return "****";
  }
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

export const createOtpTraceId = () => randomBytes(4).toString("hex");

export const startOtpSendTrace = (phone: string, provider: string) => {
  const trace: OtpSendTrace = {
    traceId: createOtpTraceId(),
    phoneMasked: maskPhone(phone),
    provider,
    attempts: [],
    startedAt: new Date().toISOString(),
    finishedAt: "",
    outcome: "failed"
  };
  lastSendTrace = trace;
  return trace;
};

export const recordOtpAttempt = (trace: OtpSendTrace, attempt: OtpAttemptTrace) => {
  trace.attempts.push(attempt);
  console.log(
    `[OTP:${trace.traceId}] ${attempt.ok ? "OK" : "FAIL"} ${attempt.label} (${trace.phoneMasked}): ${attempt.detail}`
  );
};

export const finishOtpSendTrace = (trace: OtpSendTrace, outcome: "sent" | "failed", error?: string) => {
  trace.finishedAt = new Date().toISOString();
  trace.outcome = outcome;
  if (error) {
    trace.error = error;
  }
  lastSendTrace = trace;
  console.log(`[OTP:${trace.traceId}] outcome=${outcome} provider=${trace.provider} phone=${trace.phoneMasked}`);
};

export const getLastOtpSendTrace = () => lastSendTrace;

export const buildOtpDebugPayload = (trace: OtpSendTrace | null) => {
  if (!trace) {
    return null;
  }

  return {
    traceId: trace.traceId,
    provider: trace.provider,
    phoneMasked: trace.phoneMasked,
    attempts: trace.attempts,
    outcome: trace.outcome,
    error: trace.error
  };
};
