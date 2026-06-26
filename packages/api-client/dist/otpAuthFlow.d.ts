import type { UserRole } from "./types.js";
export declare const TEST_LOGIN_PHONE = "1010101010";
export declare const TEST_LOGIN_OTP = "000000";
export declare const isTestLoginPhone: (phone: string) => boolean;
export declare const isTestOtpLogin: (phone: string, otp: string) => boolean;
export type OtpAuthProvider = "2factor" | "firebase";
export type OtpSessionInfo = {
    provider: OtpAuthProvider;
    deliveryHint?: string;
};
export declare const sendOtpWithFallback: (phone: string, role: UserRole) => Promise<OtpSessionInfo>;
export declare const verifyOtpSession: (phone: string, otp: string, role: UserRole, session: OtpSessionInfo) => Promise<import("./auth.api.js").VerifyOtpResponse>;
//# sourceMappingURL=otpAuthFlow.d.ts.map