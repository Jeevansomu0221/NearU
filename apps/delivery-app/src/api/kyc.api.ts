import { apiPost, ApiResponse } from "./client";
import type { DeliveryProfile } from "./profile.api";

export type AadhaarOtpSendResult = {
  initiationTransactionId: string;
  maskedAadhaar: string;
  message?: string;
};

export type AadhaarVerifyResult = DeliveryProfile & {
  extracted?: {
    name?: string;
    dateOfBirth?: string;
    address?: string;
    gender?: string;
  };
};

export const sendAadhaarOtp = (payload: {
  aadhaarNumber: string;
  consent: boolean;
}): Promise<ApiResponse<AadhaarOtpSendResult>> => {
  return apiPost<AadhaarOtpSendResult>("/delivery/kyc/aadhaar/send-otp", payload);
};

export const verifyAadhaarOtp = (payload: {
  otp: string;
  initiationTransactionId?: string;
}): Promise<ApiResponse<AadhaarVerifyResult>> => {
  return apiPost<AadhaarVerifyResult>("/delivery/kyc/aadhaar/verify-otp", payload);
};

export const verifyPan = (payload: {
  panNumber: string;
  consent: boolean;
}): Promise<ApiResponse<DeliveryProfile & { panName?: string | null }>> => {
  return apiPost("/delivery/kyc/pan/verify", payload);
};

export const skipPan = (): Promise<ApiResponse<DeliveryProfile>> => {
  return apiPost<DeliveryProfile>("/delivery/kyc/pan/skip", {});
};

export const verifyBank = (payload: {
  bankAccountNumber: string;
  bankIfsc: string;
  bankAccountHolderName?: string;
  bankUpiId?: string;
  allowAdminFallback?: boolean;
}): Promise<
  ApiResponse<
    DeliveryProfile & {
      beneficiaryName?: string | null;
      nameMatchScore?: number | null;
      adminFallback?: boolean;
      decentroError?: string;
    }
  >
> => {
  return apiPost("/delivery/kyc/bank/verify", payload);
};

export const skipBank = (): Promise<ApiResponse<DeliveryProfile>> => {
  return apiPost<DeliveryProfile>("/delivery/kyc/bank/skip", {});
};

export const saveRegistrationBasics = (payload: {
  vehicleType: DeliveryProfile["vehicleType"];
  vehicleNumber?: string;
  licenseNumber?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  termsAccepted: boolean;
}): Promise<ApiResponse<DeliveryProfile>> => {
  return apiPost<DeliveryProfile>("/delivery/kyc/registration-basics", payload);
};
