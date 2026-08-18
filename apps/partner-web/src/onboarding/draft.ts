import { ONBOARDING_STEPS } from "./constants";
import {
  defaultDocuments,
  defaultMedia,
  defaultOperations,
  emptyMenuItem,
  type OnboardingDraft
} from "./types";
import type { PartnerKycState } from "@vyaha/api-client";

export const normalizeDraft = (draft: unknown): OnboardingDraft | null => {
  if (!draft || typeof draft !== "object") return null;
  const d = draft as Record<string, unknown>;
  const safeForm = typeof d.form === "object" && d.form ? (d.form as Record<string, unknown>) : {};
  const safeAddress = typeof d.address === "object" && d.address ? (d.address as Record<string, unknown>) : {};
  const safeDocuments = typeof d.documents === "object" && d.documents ? (d.documents as Record<string, unknown>) : {};
  const safeLocation = typeof d.shopLocation === "object" && d.shopLocation ? (d.shopLocation as Record<string, unknown>) : null;

  return {
    activeStep: Number.isFinite(Number(d.activeStep))
      ? Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, Number(d.activeStep)))
      : 0,
    form: {
      ownerName: String(safeForm.ownerName || ""),
      restaurantName: String(safeForm.restaurantName || ""),
      phone: String(safeForm.phone || safeForm.ownerPhone || ""),
      restaurantPhone: String(safeForm.restaurantPhone || ""),
      email: String(safeForm.email || "")
    },
    address: {
      shopHouseName: String(safeAddress.shopHouseName || ""),
      floor: String(safeAddress.floor || ""),
      state: String(safeAddress.state || ""),
      city: String(safeAddress.city || ""),
      pincode: String(safeAddress.pincode || ""),
      area: String(safeAddress.area || ""),
      colony: String(safeAddress.colony || ""),
      roadStreet: String(safeAddress.roadStreet || ""),
      nearbyPlaces: String(safeAddress.nearbyPlaces || "")
    },
    documents: {
      ...defaultDocuments(),
      fssaiNumber: String(safeDocuments.fssaiNumber || ""),
      fssaiUrl: String(safeDocuments.fssaiUrl || ""),
      panNumber: String(safeDocuments.panNumber || ""),
      panFrontUrl: String(safeDocuments.panFrontUrl || ""),
      gstRegistered:
        safeDocuments.gstRegistered === true || safeDocuments.gstRegistered === "yes"
          ? "yes"
          : safeDocuments.gstRegistered === false || safeDocuments.gstRegistered === "no"
            ? "no"
            : "",
      gstNumber: String(safeDocuments.gstNumber || ""),
      gstUrl: String(safeDocuments.gstUrl || ""),
      bankAccountHolderName: String(safeDocuments.bankAccountHolderName || ""),
      bankAccountNumber: String(safeDocuments.bankAccountNumber || ""),
      bankIfsc: String(safeDocuments.bankIfsc || "")
    },
    media:
      typeof d.media === "object" && d.media
        ? {
            shopImageUrl: String((d.media as Record<string, unknown>).shopImageUrl || ""),
            bannerImageUrl: String((d.media as Record<string, unknown>).bannerImageUrl || ""),
            restaurantPhotosUrls: Array.isArray((d.media as Record<string, unknown>).restaurantPhotosUrls)
              ? ((d.media as Record<string, unknown>).restaurantPhotosUrls as unknown[])
                  .map((url) => String(url || ""))
                  .filter(Boolean)
              : []
          }
        : defaultMedia(),
    operations:
      typeof d.operations === "object" && d.operations
        ? {
            openingTime: String((d.operations as Record<string, unknown>).openingTime || "08:00"),
            closingTime: String((d.operations as Record<string, unknown>).closingTime || "22:00"),
            weeklyHolidays: Array.isArray((d.operations as Record<string, unknown>).weeklyHolidays)
              ? ((d.operations as Record<string, unknown>).weeklyHolidays as unknown[])
                  .map((day) => String(day || ""))
                  .filter(Boolean)
              : [],
            deliveryMode: (d.operations as Record<string, unknown>).deliveryMode === "self" ? "self" : "platform",
            takeawayAvailable: (d.operations as Record<string, unknown>).takeawayAvailable !== false,
            packagingNote: String((d.operations as Record<string, unknown>).packagingNote || "")
          }
        : defaultOperations(),
    menuDraft: Array.isArray(d.menuDraft)
      ? d.menuDraft.map((item) => {
          const row = item as Record<string, unknown>;
          return {
            name: String(row?.name || ""),
            description: String(row?.description || ""),
            price: String(row?.price || ""),
            isVegetarian: row?.isVegetarian !== false,
            imageUrl: String(row?.imageUrl || "")
          };
        })
      : [emptyMenuItem()],
    kyc: typeof d.kyc === "object" && d.kyc ? (d.kyc as PartnerKycState) : {},
    selectedCategory: String(d.selectedCategory || ""),
    shopLocation:
      safeLocation && Number.isFinite(Number(safeLocation.latitude)) && Number.isFinite(Number(safeLocation.longitude))
        ? { latitude: Number(safeLocation.latitude), longitude: Number(safeLocation.longitude) }
        : null
  };
};

export const buildDraftPayload = (draft: Omit<OnboardingDraft, "updatedAt">): OnboardingDraft => ({
  ...draft,
  updatedAt: new Date().toISOString()
});
