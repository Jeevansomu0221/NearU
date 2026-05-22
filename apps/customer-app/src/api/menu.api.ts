// apps/customer-app/src/api/menu.api.ts
import api from "./client";

/**
 * GET PARTNER MENU
 */
export const getPartnerMenu = (partnerId: string) => {
  return api.get(`/menu/partner/${partnerId}`);
};

/**
 * GET ALL APPROVED PARTNERS/SHOPS (for HomeScreen)
 */
export const getPartners = (params?: {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}) => {
  return api.get("/partners/shops", { params });
};

/**
 * GET PARTNER DETAILS BY ID
 */
export const getPartnerDetails = (partnerId: string) => {
  return api.get(`/partners/${partnerId}`);
};
