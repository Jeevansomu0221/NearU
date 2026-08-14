const SHOP_NAME_ALIASES: Record<string, string> = {
  "fastfood test": "Burger Yard Express",
  "raja cloud": "Raja Cloud Kitchen",
  "raja cloud kitchen": "Raja Cloud Kitchen",
  "paradise biryani": "Raja Cloud Kitchen"
};

const ADDRESS_ALIASES: Record<string, string> = {
  "123 main street, bangalore": "48 Lake View Road, Indiranagar, Bengaluru",
  "123 main street": "48 Lake View Road, Indiranagar",
  "test address": "48 Lake View Road, Indiranagar, Bengaluru"
};

export const getPublicShopName = (value?: string) => {
  const raw = (value || "").trim();
  const normalized = raw.toLowerCase();
  return SHOP_NAME_ALIASES[normalized] || raw || "Restaurant";
};

export const getPublicAddressText = (value?: string) => {
  const raw = (value || "").trim();
  const normalized = raw.toLowerCase();
  return ADDRESS_ALIASES[normalized] || raw || "Address not available";
};

export const formatPaymentMethodLabel = (method?: string) => {
  const normalized = String(method || "").trim().toUpperCase();
  if (normalized === "CASH_ON_DELIVERY" || normalized === "COD") return "COD";
  if (normalized === "UPI") return "UPI";
  if (normalized === "RAZORPAY" || normalized === "ONLINE") return "Online";
  return method?.trim() || "Online";
};
