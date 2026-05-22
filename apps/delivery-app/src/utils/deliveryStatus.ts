import type { DeliveryProfile } from "../api/profile.api";

export const resolveDeliveryRoute = (profile?: DeliveryProfile | null) => {
  if (!profile) return "Login";
  // VERIFIED riders are also allowed in; the backend auto-promotes them to
  // ACTIVE the first time they share a valid location.
  if (profile.status === "ACTIVE" || profile.status === "VERIFIED") return "Main";
  if (["PENDING", "REJECTED", "SUSPENDED", "INACTIVE"].includes(profile.status)) {
    return "ReviewStatus";
  }
  if (!profile.isProfileComplete) return "CompleteProfile";
  return "ReviewStatus";
};
