import api from "./client";

export const sendOtp = (phone: string, role: string) =>
  api.post("/auth/send-otp", { phone, role });

export const verifyOtp = (phone: string, otp: string, role: string) =>
  api.post("/auth/verify-otp", { phone, otp, role });
