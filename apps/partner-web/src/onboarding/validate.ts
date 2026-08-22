import type { PartnerKycState } from "@vyaha/api-client";
import type { DocumentState } from "./types";

export const validateStep = (
  step: number,
  form: { ownerName: string; restaurantName: string; phone: string; restaurantPhone: string; email: string },
  address: {
    shopHouseName?: string;
    floor?: string;
    state: string;
    city: string;
    pincode: string;
    area: string;
    colony: string;
    roadStreet?: string;
  },
  selectedCategory: string,
  documents: DocumentState,
  kyc: PartnerKycState,
  operations: { openingTime: string; closingTime: string }
): string | null => {
  if (step === 0) {
    if (!form.ownerName || !form.restaurantName || !form.phone || !form.restaurantPhone) {
      return "Please fill all basic details";
    }
    if (form.phone.length !== 10) return "Enter a valid 10-digit phone number";
    if (form.restaurantPhone.length !== 10) return "Enter a valid 10-digit restaurant phone number";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Enter a valid email address";
    }
  }

  if (step === 1) {
    if (!form.restaurantName.trim()) return "Enter the shop name as it appears on Google Maps.";
    if (!address.shopHouseName?.trim()) return "Enter the shop or house name";
    if (!address.floor?.trim()) return "Enter the floor or shop location";
    if (!address.state || !address.city || !address.pincode || !address.area || !address.colony) {
      return "Please fill all required address fields";
    }
    if (!/^\d{6}$/.test(address.pincode)) return "Pincode must be exactly 6 digits";
  }

  if (step === 2 && !selectedCategory) return "Please select a business category";

  if (step === 3) {
    if (!documents.fssaiUrl.trim()) return "Upload your FSSAI certificate";
    if (!kyc.panVerified && !kyc.panSkipped) return "Verify PAN via Eko or skip for now";
    if (!documents.gstRegistered) return "Please select whether you are GST registered";
    if (documents.gstRegistered === "yes" && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(documents.gstNumber.trim())) {
      return "Enter a valid 15-character GSTIN";
    }
    if (documents.gstRegistered === "yes" && !documents.gstUrl.trim()) return "Upload your GST certificate";
  }

  if (step === 4) {
    const bankDone =
      kyc.bankVerificationStatus === "VERIFIED" ||
      kyc.bankDetailsSkipped ||
      kyc.bankVerificationStatus === "PENDING_ADMIN";
    if (!bankDone) return "Verify bank account or click Skip bank";
  }

  if (step === 7) {
    if (!operations.openingTime.trim() || !operations.closingTime.trim()) {
      return "Please set opening and closing hours";
    }
  }

  return null;
};
