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
  try {
    const response = await api.get<ApiEnvelope<AccountDeletionRequest | null>>("/users/me/deletion-request");
    const request = response.data.data;
    if (isActiveDeletionRequest(request)) {
      await cacheDeletionRequest(request);
      return request;
    }

    const cached = await getCachedDeletionRequest();
    if (cached?.status === "REJECTED") {
      return cached;
    }

    await cacheDeletionRequest(null);
    return request;
  } catch {
    const cached = await getCachedDeletionRequest();
    if (isActiveDeletionRequest(cached)) {
      return cached;
    }
    throw new Error("Failed to fetch deletion request");
  }
};

export const applyDeletionStatusFromNotification = async (
  data?: Record<string, string> | null
): Promise<AccountDeletionRequest | null> => {
  const type = String(data?.type || "");
  if (type !== "ACCOUNT_DELETION_APPROVED" && type !== "ACCOUNT_DELETION_REJECTED") {
    return null;
  }

  const status = type === "ACCOUNT_DELETION_APPROVED" ? "APPROVED" : "REJECTED";
  const cached = await getCachedDeletionRequest();
  const updated: AccountDeletionRequest = {
    _id: data?.requestId || cached?._id || "unknown",
    reason: cached?.reason || "",
    reasonCategory: cached?.reasonCategory,
    status,
    rejectionReason: data?.rejectionReason || cached?.rejectionReason,
    reviewedAt: new Date().toISOString(),
    createdAt: cached?.createdAt || new Date().toISOString()
  };

  await cacheDeletionRequest(updated);
  return updated;
};

export const cancelAccountDeletionRequest = async () => {
  const response = await api.delete<ApiEnvelope<AccountDeletionRequest>>("/users/me/deletion-request");
  await cacheDeletionRequest(null);
  return response.data.data;
};

export const resolveDeletionRequest = async (
  initialRequest?: AccountDeletionRequest | null
): Promise<AccountDeletionRequest | null> => {
  try {
    const remote = await getMyDeletionRequest();
    if (isActiveDeletionRequest(remote)) {
      return remote;
    }
    return null;
  } catch {
    // fall back to cache below
  }

  const cached = await getCachedDeletionRequest();
  if (isActiveDeletionRequest(cached)) {
    return cached;
  }

  if (
    initialRequest &&
    initialRequest.status !== "PENDING" &&
    isActiveDeletionRequest(initialRequest)
  ) {
    return initialRequest;
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

type DeletionRefreshListener = (request?: AccountDeletionRequest | null) => void;
const deletionRefreshListeners = new Set<DeletionRefreshListener>();

export const subscribeDeletionRequestRefresh = (listener: DeletionRefreshListener) => {
  deletionRefreshListeners.add(listener);
  return () => deletionRefreshListeners.delete(listener);
};

export const notifyDeletionRequestRefresh = (request?: AccountDeletionRequest | null) => {
  deletionRefreshListeners.forEach((listener) => listener(request));
};
