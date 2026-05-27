const SHOP_NAME_ALIASES: Record<string, string> = {
  "fastfood test": "Burger Yard Express",
  "raja cloud": "Raja Cloud Kitchen"
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
