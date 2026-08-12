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
export declare const getPartnerKycStatus: () => Promise<PartnerKycState>;
export declare const verifyPartnerPan: (payload: {
    panNumber: string;
    consent: boolean;
    ownerName?: string;
}) => Promise<{
    kyc: PartnerKycState;
    panName?: string;
}>;
export declare const skipPartnerPan: () => Promise<{
    kyc: PartnerKycState;
}>;
export declare const verifyPartnerFssai: (payload: {
    fssaiNumber: string;
}) => Promise<{
    kyc: PartnerKycState;
    businessName?: string | null;
    licenseStatus?: string | null;
    expiryDate?: string | null;
}>;
export declare const verifyPartnerGst: (payload: {
    gstNumber: string;
    businessName?: string;
}) => Promise<{
    kyc: PartnerKycState;
    legalName?: string | null;
    tradeName?: string | null;
    status?: string | null;
}>;
export declare const verifyPartnerBank: (payload: {
    bankAccountNumber: string;
    bankIfsc: string;
    bankAccountHolderName?: string;
    allowAdminFallback?: boolean;
}) => Promise<{
    kyc: PartnerKycState;
    beneficiaryName?: string | null;
    adminFallback?: boolean;
    ekoError?: string;
}>;
export declare const skipPartnerBank: () => Promise<{
    kyc: PartnerKycState;
}>;
export declare const acceptPartnerAgreement: (payload: {
    termsAccepted: boolean;
    partnerAgreementAccepted: boolean;
}) => Promise<{
    kyc: PartnerKycState;
}>;
//# sourceMappingURL=partnerKyc.api.d.ts.map