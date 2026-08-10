import api from "./client";

export type PartnerKycState = {
  aadhaarVerified?: boolean;
  aadhaarVerifiedAt?: string;
  aadhaarName?: string;
  aadhaarMasked?: string;
  aadhaarNumber?: string;
  panVerified?: boolean;
  panVerifiedAt?: string;
  panNumber?: string;
  panName?: string;
  panSkipped?: boolean;
  bankVerificationStatus?: string;
  bankVerifiedAt?: string;
  bankDetailsSkipped?: boolean;
  bankAccountHolderName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  termsAcceptedAt?: string;
  partnerAgreementAcceptedAt?: string;
};

export type DigiLockerStartResult = {
  initiationTransactionId: string;
  authorizationUrl: string;
  mock?: boolean;
  message?: string;
};

const unwrap = <T,>(response: { data: { success: boolean; data?: T; message?: string } }) => {
  if (!response.data?.success) {
    throw new Error(response.data?.message || "Request failed");
  }
  return response.data.data as T;
};

export const getPartnerKycStatus = async () => {
  const response = await api.get<{ success: boolean; data: PartnerKycState }>("/partners/kyc/status");
  return unwrap<PartnerKycState>(response);
};

export const startPartnerDigiLocker = async (payload: { consent: boolean }) => {
  const response = await api.post<{ success: boolean; data: DigiLockerStartResult }>(
    "/partners/kyc/digilocker/start",
    payload
  );
  return unwrap<DigiLockerStartResult>(response);
};

export const completePartnerDigiLocker = async (payload: {
  initiationTransactionId?: string;
  code?: string;
  reference_id?: string;
  verification_id?: string;
}) => {
  const response = await api.post<{
    success: boolean;
    data: { kyc: PartnerKycState; extracted?: { name?: string } };
  }>("/partners/kyc/digilocker/complete", payload);
  return unwrap<{ kyc: PartnerKycState; extracted?: { name?: string } }>(response);
};

export const verifyPartnerPan = async (payload: { panNumber: string; consent: boolean }) => {
  const response = await api.post<{ success: boolean; data: { kyc: PartnerKycState; panName?: string } }>(
    "/partners/kyc/pan/verify",
    payload
  );
  return unwrap<{ kyc: PartnerKycState; panName?: string }>(response);
};

export const skipPartnerPan = async () => {
  const response = await api.post<{ success: boolean; data: { kyc: PartnerKycState } }>("/partners/kyc/pan/skip", {});
  return unwrap<{ kyc: PartnerKycState }>(response);
};

export const verifyPartnerBank = async (payload: {
  bankAccountNumber: string;
  bankIfsc: string;
  bankAccountHolderName?: string;
  allowAdminFallback?: boolean;
}) => {
  const response = await api.post<{
    success: boolean;
    data: {
      kyc: PartnerKycState;
      beneficiaryName?: string | null;
      adminFallback?: boolean;
      ekoError?: string;
    };
  }>("/partners/kyc/bank/verify", payload);
  return unwrap<{
    kyc: PartnerKycState;
    beneficiaryName?: string | null;
    adminFallback?: boolean;
    ekoError?: string;
  }>(response);
};

export const skipPartnerBank = async () => {
  const response = await api.post<{ success: boolean; data: { kyc: PartnerKycState } }>("/partners/kyc/bank/skip", {});
  return unwrap<{ kyc: PartnerKycState }>(response);
};

export const acceptPartnerAgreement = async (payload: {
  termsAccepted: boolean;
  partnerAgreementAccepted: boolean;
}) => {
  const response = await api.post<{ success: boolean; data: { kyc: PartnerKycState } }>(
    "/partners/kyc/accept-agreement",
    payload
  );
  return unwrap<{ kyc: PartnerKycState }>(response);
};
