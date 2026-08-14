type JobDetailsRefreshListener = (orderId?: string) => void;

const listeners = new Set<JobDetailsRefreshListener>();

export const subscribeJobDetailsRefresh = (listener: JobDetailsRefreshListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const notifyJobDetailsRefresh = (orderId?: string) => {
  listeners.forEach((listener) => listener(orderId));
};
