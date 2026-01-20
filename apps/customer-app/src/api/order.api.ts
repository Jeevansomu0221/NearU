import api from "./client";

export const createOrder = (
  deliveryAddress: string,
  note: string
) => {
  return api.post("/orders", {
    deliveryAddress,
    note
  });
};
