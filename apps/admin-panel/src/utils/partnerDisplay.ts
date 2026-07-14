/** Display aliases used in the customer app — search/admin should match these names too. */
const SHOP_NAME_ALIASES: Record<string, string> = {
  "fastfood test": "Burger Yard Express",
  "raja cloud": "Raja Cloud Kitchen"
};

export const getPartnerDisplayName = (partner: {
  restaurantName?: string;
  shopName?: string;
}) => {
  const raw = (partner.shopName || partner.restaurantName || "").trim();
  const normalized = raw.toLowerCase();
  return SHOP_NAME_ALIASES[normalized] || raw || "Restaurant";
};

export const getPartnerSearchHaystack = (partner: {
  ownerName?: string;
  restaurantName?: string;
  shopName?: string;
  phone?: string;
  ownerPhone?: string;
  restaurantPhone?: string;
  category?: string;
}) => {
  const displayName = getPartnerDisplayName(partner);
  return [
    partner.ownerName,
    partner.restaurantName,
    partner.shopName,
    displayName,
    partner.phone,
    partner.ownerPhone,
    partner.restaurantPhone,
    partner.category
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};
