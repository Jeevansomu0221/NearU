let availableJobsTabFocused = false;
let knownJobIds = new Set<string>();
let initialSyncDone = false;

type FocusListener = (focused: boolean) => void;
const focusListeners = new Set<FocusListener>();

export const setAvailableJobsTabFocused = (focused: boolean) => {
  availableJobsTabFocused = focused;
  focusListeners.forEach((listener) => listener(focused));
};

export const subscribeAvailableJobsFocus = (listener: FocusListener) => {
  focusListeners.add(listener);
  return () => focusListeners.delete(listener);
};

export const isAvailableJobsTabFocused = () => availableJobsTabFocused;

export const syncKnownAvailableJobIds = (jobIds: string[]) => {
  knownJobIds = new Set(jobIds);
  initialSyncDone = true;
};

export const detectNewAvailableJobIds = (jobIds: string[]) => {
  const incoming = new Set(jobIds);
  const newlyAdded = jobIds.filter((id) => !knownJobIds.has(id));
  knownJobIds = incoming;
  return initialSyncDone ? newlyAdded : [];
};

export const markAvailableJobsInitialSyncPending = () => {
  initialSyncDone = false;
};
