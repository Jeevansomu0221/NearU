import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./client";

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

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

const DELETION_REQUEST_CACHE_KEY = "partner_account_deletion_request_v1";

export const cacheDeletionRequest = async (request: AccountDeletionRequest | null) => {
  if (!request) {
    await AsyncStorage.removeItem(DELETION_REQUEST_CACHE_KEY);
    return;
  }
  await AsyncStorage.setItem(DELETION_REQUEST_CACHE_KEY, JSON.stringify(request));
};

export const getCachedDeletionRequest = async (): Promise<AccountDeletionRequest | null> => {
  const raw = await AsyncStorage.getItem(DELETION_REQUEST_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AccountDeletionRequest;
  } catch {
    return null;
  }
};

export const ACTIVE_DELETION_STATUSES: AccountDeletionRequest["status"][] = [
  "PENDING",
  "APPROVED",
  "REJECTED"
];

export const STARTUP_DELETION_STATUSES: AccountDeletionRequest["status"][] = [
  "PENDING",
  "APPROVED"
];

export const isActiveDeletionRequest = (
  request?: AccountDeletionRequest | null
): request is AccountDeletionRequest =>
  Boolean(request?.status && ACTIVE_DELETION_STATUSES.includes(request.status));

export const requestAccountDeletion = async (payload: { reason: string; reasonCategory?: string }) => {
  const response = await api.post<ApiEnvelope<AccountDeletionRequest>>("/users/me/deletion-request", payload);
  const request = response.data.data;
  await cacheDeletionRequest(request);
  return request;
};

export const getMyDeletionRequest = async () => {
  const response = await api.get<ApiEnvelope<AccountDeletionRequest | null>>("/users/me/deletion-request");
  const request = response.data.data;
  if (isActiveDeletionRequest(request)) {
    await cacheDeletionRequest(request);
  } else {
    await cacheDeletionRequest(null);
  }
  return request;
};

export const cancelAccountDeletionRequest = async () => {
  const response = await api.delete<ApiEnvelope<AccountDeletionRequest>>("/users/me/deletion-request");
  await cacheDeletionRequest(null);
  return response.data.data;
};

export const resolveDeletionRequest = async (
  initialRequest?: AccountDeletionRequest | null
): Promise<AccountDeletionRequest | null> => {
  if (isActiveDeletionRequest(initialRequest)) {
    return initialRequest;
  }

  try {
    const remote = await getMyDeletionRequest();
    if (isActiveDeletionRequest(remote)) {
      return remote;
    }
  } catch {
    // fall back to cache below
  }

  const cached = await getCachedDeletionRequest();
  if (isActiveDeletionRequest(cached)) {
    return cached;
  }

  return null;
};

export const resolveStartupDeletionRequest = async (): Promise<AccountDeletionRequest | null> => {
  try {
    const remote = await getMyDeletionRequest();
    if (remote?.status && STARTUP_DELETION_STATUSES.includes(remote.status)) {
      return remote;
    }
    return null;
  } catch {
    const cached = await getCachedDeletionRequest();
    if (cached?.status && STARTUP_DELETION_STATUSES.includes(cached.status)) {
      return cached;
    }
    return null;
  }
};
