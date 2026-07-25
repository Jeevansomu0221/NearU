import type { DeliveryProfile } from "../api/profile.api";

export const resolveDeliveryRoute = (profile?: DeliveryProfile | null) => {
  if (!profile) return "Login";

  // Digital KYC: Aadhaar-verified riders are auto-activated and can enter the app.
  if (profile.status === "ACTIVE" || profile.status === "VERIFIED") {
    if (!profile.documents?.aadhaarVerified && !profile.isProfileComplete) {
      return "CompleteProfile";
    }
    return "Main";
  }

  if (profile.status === "SUSPENDED") return "ReviewStatus";

  if (!profile.documents?.aadhaarVerified || !profile.isProfileComplete) {
    return "CompleteProfile";
  }

  if (["PENDING", "REJECTED", "INACTIVE"].includes(profile.status)) {
    // Legacy document-upload riders awaiting admin review.
    return "ReviewStatus";
  }

  return "CompleteProfile";
};
