import type { PartnerKycState } from "@vyaha/api-client";

export type DocumentState = {
  fssaiNumber: string;
  fssaiUrl: string;
  panNumber: string;
  panFrontUrl: string;
  gstRegistered: "yes" | "no" | "";
  gstNumber: string;
  gstUrl: string;
  bankAccountHolderName: string;
  bankAccountNumber: string;
  bankIfsc: string;
};

export type MediaState = {
  shopImageUrl: string;
  bannerImageUrl: string;
  restaurantPhotosUrls: string[];
};

export type OperationsState = {
  openingTime: string;
  closingTime: string;
  weeklyHolidays: string[];
  deliveryMode: "self" | "platform";
  takeawayAvailable: boolean;
  packagingNote: string;
};

export type MenuDraftItem = {
  name: string;
  description: string;
  price: string;
  isVegetarian: boolean;
  imageUrl: string;
};

export type OnboardingDraft = {
  activeStep: number;
  form: {
    ownerName: string;
    restaurantName: string;
    phone: string;
    restaurantPhone: string;
    email: string;
  };
  address: {
    state: string;
    city: string;
    pincode: string;
    area: string;
    colony: string;
    roadStreet: string;
    nearbyPlaces: string;
  };
  documents: DocumentState;
  media: MediaState;
  operations: OperationsState;
  menuDraft: MenuDraftItem[];
  kyc: PartnerKycState;
  selectedCategory: string;
  shopLocation: { latitude: number; longitude: number } | null;
  updatedAt?: string;
};

export const defaultOperations = (): OperationsState => ({
  openingTime: "08:00",
  closingTime: "22:00",
  weeklyHolidays: [],
  deliveryMode: "platform",
  takeawayAvailable: true,
  packagingNote: ""
});

export const defaultMedia = (): MediaState => ({
  shopImageUrl: "",
  bannerImageUrl: "",
  restaurantPhotosUrls: []
});

export const defaultDocuments = (): DocumentState => ({
  fssaiNumber: "",
  fssaiUrl: "",
  panNumber: "",
  panFrontUrl: "",
  gstRegistered: "",
  gstNumber: "",
  gstUrl: "",
  bankAccountHolderName: "",
  bankAccountNumber: "",
  bankIfsc: ""
});

export const emptyMenuItem = (): MenuDraftItem => ({
  name: "",
  description: "",
  price: "",
  isVegetarian: true,
  imageUrl: ""
});
