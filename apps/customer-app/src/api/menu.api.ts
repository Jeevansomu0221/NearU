import api from "./client";

export const getPartnerMenu = (partnerId: string) => {
  return api.get(`/menu/partner/${partnerId}`);
};
