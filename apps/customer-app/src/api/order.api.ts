import api from "./client";

/**
 * ================================
 * CREATE CUSTOM ORDER
 * ================================
 */
export const createCustomOrder = (
  deliveryAddress: string,
  note: string
) => {
  return api.post("/orders", {
    orderType: "CUSTOM",
    deliveryAddress,
    note
  });
};

/**
 * ================================
 * CREATE SHOP ORDER
 * ================================
 */
export const createShopOrder = (
  partnerId: string,
  deliveryAddress: string,
  items: {
    name: string;
    quantity: number;
    price: number;
  }[]
) => {
  return api.post("/orders", {
    orderType: "SHOP",
    partnerId,
    deliveryAddress,
    items
  });
};
