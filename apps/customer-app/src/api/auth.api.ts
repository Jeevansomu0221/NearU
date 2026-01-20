import api from "./client";

export const sendOtp = (phone: string) => {
  return api.post("/auth/send-otp", {
    phone,
    role: "customer"
  });
};

export const verifyOtp = (phone: string, otp: string) => {
  return api.post("/auth/verify-otp", {
    phone,
    otp
  });
};
