import { apiGet, apiPost } from "./client.js";
const unwrap = (response) => {
    if (!response?.success) {
        throw new Error(response?.message || "Request failed");
    }
    return response.data;
};
export const getPartnerKycStatus = () => apiGet("/partners/kyc/status").then(unwrap);
export const verifyPartnerPan = (payload) => apiPost("/partners/kyc/pan/verify", payload).then(unwrap);
export const skipPartnerPan = () => apiPost("/partners/kyc/pan/skip", {}).then(unwrap);
export const verifyPartnerFssai = (payload) => apiPost("/partners/kyc/fssai/verify", payload).then(unwrap);
export const verifyPartnerGst = (payload) => apiPost("/partners/kyc/gst/verify", payload).then(unwrap);
export const verifyPartnerBank = (payload) => apiPost("/partners/kyc/bank/verify", payload).then(unwrap);
export const skipPartnerBank = () => apiPost("/partners/kyc/bank/skip", {}).then(unwrap);
export const acceptPartnerAgreement = (payload) => apiPost("/partners/kyc/accept-agreement", payload).then(unwrap);
