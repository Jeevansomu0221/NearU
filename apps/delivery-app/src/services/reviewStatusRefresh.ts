type ReviewStatusRefreshListener = () => void;

const listeners = new Set<ReviewStatusRefreshListener>();

export const subscribeReviewStatusRefresh = (listener: ReviewStatusRefreshListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const notifyReviewStatusRefresh = () => {
  listeners.forEach((listener) => listener());
};
