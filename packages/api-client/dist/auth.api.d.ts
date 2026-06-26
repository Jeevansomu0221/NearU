import type { UserRole } from "./types.js";
export interface SendOtpResponse {
    success: boolean;
    message: string;
    data?: {
        phone: string;
        provider?: string;
        deliveryHint?: string;
        useFirebaseFallback?: boolean;
        fallbackReason?: string;
        devOtp?: string;
    };
}
export interface VerifyOtpResponse {
    success: boolean;
    message?: string;
    data?: {
        token: string;
        refreshToken: string;
        user: {
            id: string;
            phone: string;
            name: string;
            role: string;
        };
    };
}
export declare const sendOtp: (phone: string, role: UserRole) => Promise<SendOtpResponse>;
export declare const verifyOtp: (phone: string, otp: string, role: UserRole) => Promise<VerifyOtpResponse>;
export declare const verifyFirebaseOtp: (phone: string, firebaseIdToken: string, role: UserRole) => Promise<VerifyOtpResponse>;
export declare const persistAuthSession: (token: string, refreshToken?: string, user?: Record<string, unknown>, phone?: string) => Promise<void>;
export declare const logout: () => Promise<void>;
export declare const deleteAccount: () => Promise<void>;
//# sourceMappingURL=auth.api.d.ts.map