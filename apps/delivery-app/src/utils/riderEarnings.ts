export const getOrderRiderEarnings = (order: {
  estimatedEarnings?: number;
  deliveryEarnings?: number;
  deliveryFee?: number;
  tipAmount?: number;
} | null | undefined) => {
  if (!order) return 0;
  if (typeof order.estimatedEarnings === "number" && order.estimatedEarnings >= 0) {
    return order.estimatedEarnings;
  }
  if (typeof order.deliveryEarnings === "number" && order.deliveryEarnings >= 0) {
    return order.deliveryEarnings;
  }
  return Number(order.deliveryFee || 0) + Number(order.tipAmount || 0);
};

export const getOrderTipAmount = (order: { tipAmount?: number } | null | undefined) =>
  Number(order?.tipAmount || 0);

export const parseMoneyInput = (value: string) => {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
