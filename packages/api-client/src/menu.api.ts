import api from "./client.js";
import type { ApiResponse, MenuItem, Shop } from "./types.js";

export const getPartnerMenu = (partnerId: string) =>
  api.get<MenuItem[]>(`/menu/partner/${partnerId}`);

export const getPartners = (params?: { latitude?: number; longitude?: number; radiusKm?: number }) =>
  api.get<Shop[]>("/partners/shops", { params });

export const getPartnerDetails = (partnerId: string) => api.get<Shop>(`/partners/${partnerId}`);

export type { Shop, MenuItem };
