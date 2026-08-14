const TEN_DIGITS = 10_000_000_000;

const fromHexObjectId = (hex: string): string => {
  if (hex.length < 8) return "";
  const value = Number.parseInt(hex.slice(-8), 16);
  if (!Number.isFinite(value)) return "";
  return String(value % TEN_DIGITS).padStart(10, "0");
};

export const getPublicOrderId = (orderId?: unknown): string => {
  if (orderId == null) return "";

  if (typeof orderId === "object") {
    const record = orderId as {
      publicOrderId?: unknown;
      _id?: unknown;
      toHexString?: () => string;
    };

    const stored = String(record.publicOrderId || "").replace(/\D/g, "");
    if (stored.length === 10) return stored;

    // Mongoose/BSON ObjectId: `_id` points at itself — never recurse into that.
    if (typeof record.toHexString === "function") {
      return fromHexObjectId(record.toHexString());
    }

    if (record._id != null && record._id !== orderId) {
      return getPublicOrderId(record._id);
    }

    const asString = String(orderId);
    if (asString && asString !== "[object Object]") {
      return getPublicOrderId(asString);
    }
    return "";
  }

  const raw = String(orderId).trim();
  if (/^\d{10}$/.test(raw)) return raw;

  const hex = raw.replace(/[^a-fA-F0-9]/g, "");
  if (hex.length >= 8) {
    const digits = fromHexObjectId(hex);
    if (digits) return digits;
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
