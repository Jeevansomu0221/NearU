import api from "./client";

export const getMyJobs = () => api.get("/delivery/jobs");

export const markPicking = (jobId: string) =>
  api.post(`/delivery/jobs/${jobId}/picking`);

export const markDelivered = (jobId: string) =>
  api.post(`/delivery/jobs/${jobId}/delivered`);
