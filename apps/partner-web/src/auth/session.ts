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

export const restorePartnerSession = async (): Promise<PartnerSession> => {
  const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);
  const phone = getStoredPhone();

  if ((!accessToken && !refreshToken) || !phone) {
    return { kind: "anonymous" };
  }

  try {
    const res = await getMyStatus();
    if (!res.success) {
      await clearAuthData();
      return { kind: "anonymous" };
    }
    return { kind: "authenticated", partner: res.data || null };
  } catch {
    await clearAuthData();
    return { kind: "anonymous" };
  }
};
