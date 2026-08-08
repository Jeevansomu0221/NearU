import { apiPost, ApiResponse } from "./client";
import type { DeliveryProfile } from "./profile.api";

export type DigiLockerStartResult = {
  initiationTransactionId: string;
  authorizationUrl: string;
  mock?: boolean;
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

export const startDigiLocker = (payload: {
  consent: boolean;
}): Promise<ApiResponse<DigiLockerStartResult>> => {
  return apiPost<DigiLockerStartResult>("/delivery/kyc/digilocker/start", payload);
};

export const completeDigiLocker = (payload: {
  initiationTransactionId?: string;
  code?: string;
  reference_id?: string;
  verification_id?: string;
}): Promise<ApiResponse<AadhaarVerifyResult>> => {
  return apiPost<AadhaarVerifyResult>("/delivery/kyc/digilocker/complete", payload);
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
      ekoError?: string;
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
