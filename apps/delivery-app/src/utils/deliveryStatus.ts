import type { DeliveryProfile } from "../api/profile.api";

export const resolveDeliveryRoute = (profile?: DeliveryProfile | null) => {
  if (!profile) return "Login";
  if (profile.status === "ACTIVE") return "Main";
  if (["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"].includes(profile.status)) {
    return "ReviewStatus";
  }
  if (!profile.isProfileComplete) return "CompleteProfile";
  return "ReviewStatus";
};
