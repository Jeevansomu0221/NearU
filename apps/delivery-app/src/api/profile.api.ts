import { apiGet, apiPut, ApiResponse } from "./client";

export interface DeliveryProfile {
  _id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  vehicleType: "Bike" | "Cycle" | "Scooter" | "Motorcycle";
  vehicleNumber?: string;
  licenseNumber?: string;
  profilePhotoUrl?: string;
  reviewComment?: string;
  documents?: {
    aadhaarUrl?: string;
    panUrl?: string;
    drivingLicenseUrl?: string;
    vehicleRcUrl?: string;
    insuranceUrl?: string;
    cancelledChequeUrl?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    submittedAt?: string;
    isComplete?: boolean;
  };
  isAvailable: boolean;
  status: "PENDING" | "VERIFIED" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "INACTIVE";
  totalDeliveries: number;
  totalEarnings: number;
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
  address?: string;
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
