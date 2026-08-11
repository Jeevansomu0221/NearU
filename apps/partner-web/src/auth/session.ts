import {
  clearAuthData,
  getAccessToken,
  getMyStatus,
  getRefreshToken,
  getStoredPhone,
  type PartnerStatusData
} from "@vyaha/api-client";

export type PartnerSession =
  | { kind: "anonymous" }
  | { kind: "authenticated"; partner: PartnerStatusData | null };

export const routeForPartnerStatus = (partner: PartnerStatusData | null): string => {
  if (!partner) return "/onboarding";
  switch (partner.status) {
    case "PENDING":
      return "/pending";
    case "REJECTED":
      return "/rejected";
    case "APPROVED":
      return partner.hasCompletedSetup === false ? "/welcome" : "/";
    default:
      return "/onboarding";
  }
};

const isPartnerNotFoundError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message || "").toLowerCase();
  const status =
    (error as { status?: number }).status ??
    (error as { statusCode?: number }).statusCode ??
    (error as { response?: { status?: number } }).response?.status;
  return message.includes("partner not found") || status === 404;
};

export const restorePartnerSession = async (): Promise<PartnerSession> => {
  const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);
  const phone = getStoredPhone();

  if ((!accessToken && !refreshToken) || !phone) {
    return { kind: "anonymous" };
  }

  try {
    const res = await getMyStatus();
    if (!res.success) {
      // New users are authenticated but have not created a partner profile yet.
      if (String(res.message || "").toLowerCase().includes("partner not found")) {
        return { kind: "authenticated", partner: null };
      }
      await clearAuthData();
      return { kind: "anonymous" };
    }
    return { kind: "authenticated", partner: res.data || null };
  } catch (error) {
    if (isPartnerNotFoundError(error)) {
      return { kind: "authenticated", partner: null };
    }
    await clearAuthData();
    return { kind: "anonymous" };
  }
};
