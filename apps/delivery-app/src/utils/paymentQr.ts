export const getPaymentLinkValue = (paymentLinkUrl?: string, imageUrl?: string) =>
  paymentLinkUrl || imageUrl || "";

const isDirectImageUrl = (url: string) =>
  /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) || /\/image/i.test(url);

export const getPaymentQrImageUrl = (paymentLinkUrl?: string, imageUrl?: string, size = 220) => {
  const value = getPaymentLinkValue(paymentLinkUrl, imageUrl);
  if (!value) {
    return "";
  }

  if (isDirectImageUrl(value)) {
    return value;
  }

  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
};
