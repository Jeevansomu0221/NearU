import api from "./client";

// Partner Management
export const getPendingPartners = () => {
  console.log('Fetching pending partners...');
  return api.get("/partners/admin/pending");
};

export const getAllPartners = (status?: string) => {
  const url = status ? `/partners/admin/all?status=${status}` : "/partners/admin/all";
  console.log('Fetching all partners from:', url);
  return api.get(url);
};

export const updatePartnerStatus = (partnerId: string, status: string, rejectionReason?: string) => {
  console.log('Updating partner status:', { partnerId, status, rejectionReason });
  return api.put(`/partners/admin/${partnerId}/status`, { status, rejectionReason });
};