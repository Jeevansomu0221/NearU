const TEN_DIGITS = 10_000_000_000;

export const getPublicOrderId = (orderId?: unknown): string => {
  if (orderId == null) return "";
  if (typeof orderId === "object") {
    const record = orderId as { publicOrderId?: unknown; _id?: unknown };
    const stored = String(record.publicOrderId || "").replace(/\D/g, "");
    if (stored.length === 10) return stored;
    return getPublicOrderId(record._id);
  }

  const raw = String(orderId).trim();
  if (/^\d{10}$/.test(raw)) return raw;

  const hex = raw.replace(/[^a-fA-F0-9]/g, "");
  if (hex.length >= 8) {
    const value = Number.parseInt(hex.slice(-8), 16);
    if (Number.isFinite(value)) {
      return String(value % TEN_DIGITS).padStart(10, "0");
    }
  }

  const digits = raw.replace(/\D/g, "");
  return digits ? digits.padStart(10, "0").slice(-10) : "";
};

export const splitPublicOrderId = (orderId?: unknown) => {
  const digits = getPublicOrderId(orderId);
  return {
    digits,
    prefixDigits: digits.slice(0, 6),
    lastFour: digits.slice(-4)
  };
};

export const formatPublicOrderId = (orderId?: unknown) => {
  const digits = getPublicOrderId(orderId);
  return digits ? `#${digits}` : "";
};

export const formatPublicOrderIdLabel = (orderId?: unknown, prefix = "Order") => {
  const formatted = formatPublicOrderId(orderId);
  return formatted ? `${prefix} ${formatted}` : prefix;
};
