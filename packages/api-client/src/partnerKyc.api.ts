import { apiGet, apiPost } from "./client.js";

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

const unwrap = <T,>(response: { success: boolean; data?: T; message?: string }) => {
  if (!response?.success) {
    throw new Error(response?.message || "Request failed");
  }
  return response.data as T;
};

export const getPartnerKycStatus = () => apiGet<PartnerKycState>("/partners/kyc/status").then(unwrap);

export const verifyPartnerPan = (payload: { panNumber: string; consent: boolean; ownerName?: string }) =>
  apiPost<{ kyc: PartnerKycState; panName?: string }>("/partners/kyc/pan/verify", payload).then(unwrap);

export const skipPartnerPan = () => apiPost<{ kyc: PartnerKycState }>("/partners/kyc/pan/skip", {}).then(unwrap);

export const verifyPartnerFssai = (payload: { fssaiNumber: string }) =>
  apiPost<{
    kyc: PartnerKycState;
    businessName?: string | null;
    licenseStatus?: string | null;
    expiryDate?: string | null;
  }>("/partners/kyc/fssai/verify", payload).then(unwrap);

export const verifyPartnerGst = (payload: { gstNumber: string; businessName?: string }) =>
  apiPost<{
    kyc: PartnerKycState;
    legalName?: string | null;
    tradeName?: string | null;
    status?: string | null;
  }>("/partners/kyc/gst/verify", payload).then(unwrap);

export const verifyPartnerBank = (payload: {
  bankAccountNumber: string;
  bankIfsc: string;
  bankAccountHolderName?: string;
  allowAdminFallback?: boolean;
}) =>
  apiPost<{
    kyc: PartnerKycState;
    beneficiaryName?: string | null;
    adminFallback?: boolean;
    ekoError?: string;
  }>("/partners/kyc/bank/verify", payload).then(unwrap);

export const skipPartnerBank = () => apiPost<{ kyc: PartnerKycState }>("/partners/kyc/bank/skip", {}).then(unwrap);

export const acceptPartnerAgreement = (payload: { termsAccepted: boolean; partnerAgreementAccepted: boolean }) =>
  apiPost<{ kyc: PartnerKycState }>("/partners/kyc/accept-agreement", payload).then(unwrap);
