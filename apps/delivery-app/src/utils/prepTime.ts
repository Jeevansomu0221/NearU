export const formatReadyByClock = (value?: Date | string | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

export const RIDER_READY_FOR_PICKUP_MESSAGE = "Order is ready for pickup";

export const getRiderReadyByMessage = (estimatedReadyAt?: string | null, prepTimeMinutes?: number | null) => {
  const clock = formatReadyByClock(estimatedReadyAt);
  if (clock) {
    return `Order will be available by ${clock}`;
  }
  if (prepTimeMinutes && prepTimeMinutes > 0) {
    return `Prep time: ${prepTimeMinutes} mins`;
  }
  return "";
};

export const getRiderPickupStatusMessage = (
  deliveryReadyAt?: string | null,
  estimatedReadyAt?: string | null,
  prepTimeMinutes?: number | null
) => {
  if (deliveryReadyAt) {
    return RIDER_READY_FOR_PICKUP_MESSAGE;
  }
  return getRiderReadyByMessage(estimatedReadyAt, prepTimeMinutes);
};
