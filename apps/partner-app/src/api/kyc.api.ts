import api from "./client";

export type PartnerKycState = {
  panVerified?: boolean;
  panVerifiedAt?: string;
  panNumber?: string;
  panName?: string;
  panSkipped?: boolean;
  fssaiVerified?: boolean;
  fssaiVerifiedAt?: string;
  fssaiNumber?: string;
  fssaiBusinessName?: string;
  fssaiLicenseStatus?: string;
  gstVerified?: boolean;
  gstVerifiedAt?: string;
  gstNumber?: string;
  gstLegalName?: string;
  gstStatus?: string;
  bankVerificationStatus?: string;
  bankVerifiedAt?: string;
  bankDetailsSkipped?: boolean;
  bankAccountHolderName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  termsAcceptedAt?: string;
  partnerAgreementAcceptedAt?: string;
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

export const verifyPartnerPan = async (payload: { panNumber: string; consent: boolean; ownerName?: string }) => {
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

export const verifyPartnerFssai = async (payload: { fssaiNumber: string }) => {
  const response = await api.post<{
    success: boolean;
    data: {
      kyc: PartnerKycState;
      businessName?: string | null;
      licenseStatus?: string | null;
      expiryDate?: string | null;
    };
  }>("/partners/kyc/fssai/verify", payload);
  return unwrap<{
    kyc: PartnerKycState;
    businessName?: string | null;
    licenseStatus?: string | null;
    expiryDate?: string | null;
  }>(response);
};

export const verifyPartnerGst = async (payload: { gstNumber: string; businessName?: string }) => {
  const response = await api.post<{
    success: boolean;
    data: {
      kyc: PartnerKycState;
      legalName?: string | null;
      tradeName?: string | null;
      status?: string | null;
    };
  }>("/partners/kyc/gst/verify", payload);
  return unwrap<{
    kyc: PartnerKycState;
    legalName?: string | null;
    tradeName?: string | null;
    status?: string | null;
  }>(response);
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
