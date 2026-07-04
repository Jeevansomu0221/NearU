import api, { ApiResponse } from "./client";

export interface AccountDeletionRequest {
  _id: string;
  reasonCategory?: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DeletionEligibility {
  canDelete: boolean;
  blockers: string[];
  payoutCheck?: {
    hasOutstandingPayouts?: boolean;
  };
}

export const getDeletionEligibility = async () => {
  const response = await api.get<ApiResponse<DeletionEligibility>>("/users/me/deletion-eligibility");
  return response.data?.data;
};

export const requestAccountDeletion = async (payload: {
  reason: string;
  reasonCategory?: string;
  codBalanceAcknowledged?: boolean;
}) => {
  const response = await api.post<ApiResponse<AccountDeletionRequest>>("/users/me/deletion-request", payload);
  return response.data?.data;
};

export const getMyDeletionRequest = async () => {
  const response = await api.get<ApiResponse<AccountDeletionRequest | null>>("/users/me/deletion-request");
  return response.data?.data;
};

export const cancelAccountDeletionRequest = async () => {
  const response = await api.delete<ApiResponse<AccountDeletionRequest>>("/users/me/deletion-request");
  return response.data?.data;
};
