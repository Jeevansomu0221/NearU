import api from "./client";

export const getNearbyShops = () => {
  return api.get("/users/shops");
};
