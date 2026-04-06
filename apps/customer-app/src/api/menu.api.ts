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
export const getPartners = () => {
  return api.get("/partners/shops");
};

/**
 * GET PARTNER DETAILS BY ID
 */
export const getPartnerDetails = (partnerId: string) => {
  return api.get(`/partners/${partnerId}`);
};
