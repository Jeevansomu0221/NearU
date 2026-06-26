import type { ApiResponse } from "./types.js";
export declare const API_BASE_URL: string;
export declare const apiGet: <T = unknown>(url: string, config?: Record<string, unknown>) => Promise<ApiResponse<T>>;
export declare const apiPost: <T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<ApiResponse<T>>;
export declare const apiPut: <T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<ApiResponse<T>>;
export declare const apiDelete: <T = unknown>(url: string, config?: Record<string, unknown>) => Promise<ApiResponse<T>>;
export declare const apiPatch: <T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<ApiResponse<T>>;
export declare const uploadMultipart: <T = unknown>(path: string, formData: FormData) => Promise<ApiResponse<T>>;
export declare const warmApi: () => Promise<void>;
declare const typedApi: {
    get: <T = unknown>(url: string, config?: Record<string, unknown>) => Promise<ApiResponse<T>>;
    post: <T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<ApiResponse<T>>;
    put: <T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<ApiResponse<T>>;
    delete: <T = unknown>(url: string, config?: Record<string, unknown>) => Promise<ApiResponse<T>>;
    patch: <T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<ApiResponse<T>>;
};
export default typedApi;
//# sourceMappingURL=client.d.ts.map