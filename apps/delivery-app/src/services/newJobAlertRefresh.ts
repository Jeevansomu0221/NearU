type NewJobAlertRefreshListener = () => void;

const listeners = new Set<NewJobAlertRefreshListener>();

export const subscribeNewJobAlertRefresh = (listener: NewJobAlertRefreshListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const notifyNewJobAlertRefresh = () => {
  listeners.forEach((listener) => listener());
};
