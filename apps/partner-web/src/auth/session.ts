import {
  clearAuthData,
  getAccessToken,
  getMyStatus,
  getRefreshToken,
  getStoredPhone,
  getStoredUser,
  type PartnerStatusData
} from "@vyaha/api-client";

export type PartnerSession =
  | { kind: "anonymous" }
  | { kind: "authenticated"; partner: PartnerStatusData | null; actorType?: "owner" | "staff" };

export const routeForPartnerStatus = (
  partner: PartnerStatusData | null,
  actorType: "owner" | "staff" = "owner"
): string => {
  if (!partner) return "/onboarding";
  switch (partner.status) {
    case "PENDING":
      return "/pending";
    case "REJECTED":
      return "/rejected";
    case "APPROVED":
      if (actorType === "staff") return "/";
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
  const storedUser = getStoredUser();
  const storedActor = storedUser?.actorType === "staff" ? "staff" : "owner";

  if (!accessToken && !refreshToken) {
    return { kind: "anonymous" };
  }
  if (!phone && storedActor !== "staff") {
    return { kind: "anonymous" };
  }

  try {
    const res = await getMyStatus();
    if (!res.success) {
      if (String(res.message || "").toLowerCase().includes("partner not found")) {
        return { kind: "authenticated", partner: null, actorType: storedActor };
      }
      await clearAuthData();
      return { kind: "anonymous" };
    }
    return {
      kind: "authenticated",
      partner: res.data || null,
      actorType: res.data?.actor?.type || storedActor
    };
  } catch (error) {
    if (isPartnerNotFoundError(error)) {
      return { kind: "authenticated", partner: null, actorType: storedActor };
    }
    await clearAuthData();
    return { kind: "anonymous" };
  }
};
