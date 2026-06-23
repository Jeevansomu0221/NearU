export type DeliveryQrType = "upi_qr" | "payment_link";

export const getPaymentQrImageUrl = (
  qrType: DeliveryQrType | undefined,
  imageUrl?: string,
  paymentLinkUrl?: string
) => {
  if (qrType === "upi_qr" && imageUrl) {
    return imageUrl;
  }

  if (qrType === "payment_link") {
    return "";
  }

  // Legacy orders stored before qrType existed.
  if (imageUrl && !paymentLinkUrl) {
    return imageUrl;
  }

  if (imageUrl && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(imageUrl)) {
    return imageUrl;
  }

  return "";
};

export const getPaymentLinkUrl = (qrType: DeliveryQrType | undefined, paymentLinkUrl?: string, imageUrl?: string) => {
  if (qrType === "payment_link") {
    return paymentLinkUrl || imageUrl || "";
  }

  return paymentLinkUrl || "";
};
