import api from "./client";

export const sendOtp = (phone: string) =>
  api.post("/auth/send-otp", { phone, role: "delivery" });

export const verifyOtp = (phone: string, otp: string) =>
  api.post("/auth/verify-otp", { phone, otp });
