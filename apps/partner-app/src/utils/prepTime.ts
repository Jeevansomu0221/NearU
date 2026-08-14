export const getReadyByFromPrepMinutes = (minutes: number, baseMs = Date.now()) =>
  new Date(baseMs + minutes * 60 * 1000);

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

export const getReadyByLabelFromMinutes = (minutes: number) => {
  const clock = formatReadyByClock(getReadyByFromPrepMinutes(minutes));
  return clock ? `Ready by ${clock}` : "";
};

export const getReadyByLabelFromDate = (value?: Date | string | null) => {
  const clock = formatReadyByClock(value);
  return clock ? `Ready by ${clock}` : "";
};
