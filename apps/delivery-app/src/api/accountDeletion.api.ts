import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiDelete, apiGet, apiPost } from "./client";

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

const DELETION_REQUEST_CACHE_KEY = "delivery_account_deletion_request_v1";

const unwrap = <T>(response: { success?: boolean; data?: T; message?: string }, fallbackMessage: string): T => {
  if (!response?.success) {
    throw new Error(response?.message || fallbackMessage);
  }
  return response.data as T;
};

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

export const getDeletionEligibility = async () => {
  const response = await apiGet<DeletionEligibility>("/users/me/deletion-eligibility");
  return unwrap(response, "Failed to check deletion eligibility");
};

export const requestAccountDeletion = async (payload: {
  reason: string;
  reasonCategory?: string;
  codBalanceAcknowledged?: boolean;
}) => {
  const response = await apiPost<AccountDeletionRequest>("/users/me/deletion-request", payload);
  const request = unwrap(response, "Failed to submit account deletion request");
  await cacheDeletionRequest(request);
  return request;
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

export const getMyDeletionRequest = async () => {
  try {
    const response = await apiGet<AccountDeletionRequest | null>("/users/me/deletion-request");
    const request = unwrap(response, "Failed to fetch deletion request");
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
  const response = await apiDelete<AccountDeletionRequest>("/users/me/deletion-request");
  const request = unwrap(response, "Failed to cancel deletion request");
  await cacheDeletionRequest(null);
  return request;
};

export const resolveDeletionRequest = async (initialRequest?: AccountDeletionRequest | null) => {
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
