/** Display aliases used in the customer app — search/admin should match these names too. */
const SHOP_NAME_ALIASES: Record<string, string> = {
  "fastfood test": "Burger Yard Express",
  "raja cloud": "Raja Cloud Kitchen",
  "raja cloud kitchen": "Raja Cloud Kitchen"
};

const resolveAlias = (value?: string) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  return SHOP_NAME_ALIASES[raw.toLowerCase()] || raw;
};

export const getPartnerDisplayName = (partner: {
  restaurantName?: string;
  shopName?: string;
}) => {
  const shopRaw = (partner.shopName || "").trim();
  const restaurantRaw = (partner.restaurantName || "").trim();

  if (shopRaw && SHOP_NAME_ALIASES[shopRaw.toLowerCase()]) {
    return SHOP_NAME_ALIASES[shopRaw.toLowerCase()];
  }
  if (restaurantRaw && SHOP_NAME_ALIASES[restaurantRaw.toLowerCase()]) {
    return SHOP_NAME_ALIASES[restaurantRaw.toLowerCase()];
  }

  return resolveAlias(shopRaw) || resolveAlias(restaurantRaw) || "Restaurant";
};

export const isPartnerDeleted = (partner: {
  isDeleted?: boolean;
  restaurantName?: string;
  shopName?: string;
  phone?: string;
  ownerPhone?: string;
  restaurantPhone?: string;
  rejectionReason?: string;
  userId?: { isActive?: boolean; deletedRoles?: string[] } | string;
}) => {
  if (partner.isDeleted) return true;

  const restaurantName = String(partner.restaurantName || "").trim();
  const shopName = String(partner.shopName || "").trim();
  const phones = [partner.phone, partner.ownerPhone, partner.restaurantPhone]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const rejectionReason = String(partner.rejectionReason || "");
  const user = typeof partner.userId === "object" && partner.userId ? partner.userId : null;

  return (
    restaurantName === "Deleted Partner" ||
    shopName === "Deleted Partner" ||
    phones.some((phone) => phone.startsWith("deleted_")) ||
    /account deleted/i.test(rejectionReason) ||
    user?.isActive === false ||
    Boolean(user?.deletedRoles?.includes("partner"))
  );
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
