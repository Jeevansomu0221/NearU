import api from "./client.js";
export const getPartnerMenu = (partnerId) => api.get(`/menu/partner/${partnerId}`);
export const getPartners = (params) => api.get("/partners/shops", { params });
export const getPartnerDetails = (partnerId) => api.get(`/partners/${partnerId}`);
