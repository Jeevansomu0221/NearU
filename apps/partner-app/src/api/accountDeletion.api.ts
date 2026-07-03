import api from "./client";

export interface AccountDeletionRequest {
  _id: string;
  reasonCategory?: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const requestAccountDeletion = async (payload: { reason: string; reasonCategory?: string }) => {
  const response = await api.post<ApiEnvelope<AccountDeletionRequest>>("/users/me/deletion-request", payload);
  return response.data.data;
};

export const getMyDeletionRequest = async () => {
  const response = await api.get<ApiEnvelope<AccountDeletionRequest | null>>("/users/me/deletion-request");
  return response.data.data;
};

export const cancelAccountDeletionRequest = async () => {
  const response = await api.delete<ApiEnvelope<AccountDeletionRequest>>("/users/me/deletion-request");
  return response.data.data;
};
