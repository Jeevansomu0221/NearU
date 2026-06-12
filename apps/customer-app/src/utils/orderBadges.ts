import type { Order } from "../api/order.api";

const ACTIVE_ORDER_STATUSES = new Set([
  "CONFIRMED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "ASSIGNED",
  "PICKED_UP"
]);

const normalizeStatus = (status?: string) => String(status || "").toUpperCase();

export const getOrderBadgeCount = (orders: Order[]) =>
  orders.filter((order) => ACTIVE_ORDER_STATUSES.has(normalizeStatus(order.status))).length;
