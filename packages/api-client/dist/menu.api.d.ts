import type { ApiResponse, MenuItem, Shop } from "./types.js";
export declare const getPartnerMenu: (partnerId: string) => Promise<ApiResponse<MenuItem[]>>;
export declare const getPartners: (params?: {
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
}) => Promise<ApiResponse<Shop[]>>;
export declare const getPartnerDetails: (partnerId: string) => Promise<ApiResponse<Shop>>;
export type { Shop, MenuItem };
//# sourceMappingURL=menu.api.d.ts.map