import type { DeliveryProfile } from "../api/profile.api";

export const resolveDeliveryRoute = (profile?: DeliveryProfile | null) => {
  if (!profile) return "Login";
  if (!profile.isProfileComplete) return "CompleteProfile";
  if (profile.status === "ACTIVE") return "Main";
  return "ReviewStatus";
};

