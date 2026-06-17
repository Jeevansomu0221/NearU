import { apiGet, apiPut, ApiResponse } from "./client";

export interface DeliveryProfile {
  _id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  termsAcceptedAt?: string;
  vehicleType: "Bike" | "Cycle" | "Bicycle" | "Scooter" | "Motorcycle" | "EV" | "Car";
  vehicleNumber?: string;
  licenseNumber?: string;
  profilePhotoUrl?: string;
  reviewComment?: string;
  documents?: {
    aadhaarNumber?: string;
    aadhaarFrontUrl?: string;
    aadhaarBackUrl?: string;
    aadhaarUrl?: string;
    panNumber?: string;
    panFrontUrl?: string;
    panUrl?: string;
    selfiePhotoUrl?: string;
    drivingLicenseFrontUrl?: string;
    drivingLicenseBackUrl?: string;
    drivingLicenseUrl?: string;
    vehicleRcFrontUrl?: string;
    vehicleRcBackUrl?: string;
    vehicleRcUrl?: string;
    insuranceUrl?: string;
    bankDocumentType?: "cheque" | "passbook" | "statement" | "";
    bankAccountHolderName?: string;
    cancelledChequeUrl?: string;
    bankPassbookUrl?: string;
    bankStatementUrl?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    bankUpiId?: string;
    submittedAt?: string;
    isComplete?: boolean;
    reuploadFlags?: Partial<Record<
      | "profilePhotoUrl"
      | "aadhaarFrontUrl"
      | "aadhaarBackUrl"
      | "panFrontUrl"
      | "selfiePhotoUrl"
      | "drivingLicenseFrontUrl"
      | "drivingLicenseBackUrl"
      | "vehicleRcFrontUrl"
      | "vehicleRcBackUrl"
      | "insuranceUrl"
      | "bankProofUrl",
      boolean
    >>;
    reuploadNotes?: string;
  };
  isAvailable: boolean;
  status: "PENDING" | "VERIFIED" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "INACTIVE";
  totalDeliveries: number;
  totalEarnings: number;
  cashBalance?: number;
  pendingDepositAmount?: number;
  lastCashActivityAt?: string;
  lastCashActivityType?: string;
  rating: number;
  ratingCount: number;
  isProfileComplete: boolean;
}

export const getDeliveryProfile = (): Promise<ApiResponse<DeliveryProfile>> => {
  return apiGet<DeliveryProfile>("/delivery/profile");
};

export const updateDeliveryProfile = (payload: {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  termsAccepted?: boolean;
  vehicleType?: DeliveryProfile["vehicleType"];
  vehicleNumber?: string;
  licenseNumber?: string;
  profilePhotoUrl?: string;
  reviewComment?: string;
  status?: DeliveryProfile["status"];
  documents?: DeliveryProfile["documents"];
  isAvailable?: boolean;
}): Promise<ApiResponse<DeliveryProfile>> => {
  return apiPut<DeliveryProfile>("/delivery/profile", payload);
};
