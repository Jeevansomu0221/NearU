import api from "./client";

export const getMySubOrders = () => {
  return api.get("/partners/suborders");
};

export const acceptSubOrder = (subOrderId: string, price: number) => {
  return api.post(`/partners/suborders/${subOrderId}/accept`, {
    price
  });
};

export const rejectSubOrder = (subOrderId: string) => {
  return api.post(`/partners/suborders/${subOrderId}/reject`);
};
