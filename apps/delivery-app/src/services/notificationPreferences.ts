import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateDeliveryProfile, type DeliveryProfile } from "../api/profile.api";

export type DeliveryNotificationPreferences = {
  jobAlerts: boolean;
  payoutAlerts: boolean;
  promotionAlerts: boolean;
  offerAlerts: boolean;
  vibrationEnabled: boolean;
};

const STORAGE_KEY = "delivery:notificationPreferences:v1";

export const DEFAULT_NOTIFICATION_PREFERENCES: DeliveryNotificationPreferences = {
  jobAlerts: true,
  payoutAlerts: true,
  promotionAlerts: false,
  offerAlerts: false,
  vibrationEnabled: true
};

const normalizePreferences = (
  value?: Partial<DeliveryNotificationPreferences> | null
): DeliveryNotificationPreferences => ({
  jobAlerts: value?.jobAlerts !== false,
  payoutAlerts: value?.payoutAlerts !== false,
  promotionAlerts: Boolean(value?.promotionAlerts),
  offerAlerts: Boolean(value?.offerAlerts),
  vibrationEnabled: value?.vibrationEnabled !== false
});

export const getNotificationPreferences = async (): Promise<DeliveryNotificationPreferences> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
};

export const saveNotificationPreferencesLocally = async (prefs: DeliveryNotificationPreferences) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalizePreferences(prefs)));
};

export const syncNotificationPreferencesFromProfile = async (profile?: DeliveryProfile | null) => {
  if (!profile?.notifications) return getNotificationPreferences();
  const prefs = normalizePreferences(profile.notifications);
  await saveNotificationPreferencesLocally(prefs);
  return prefs;
};

export const persistNotificationPreferences = async (prefs: DeliveryNotificationPreferences) => {
  const normalized = normalizePreferences(prefs);
  await saveNotificationPreferencesLocally(normalized);
  try {
    await updateDeliveryProfile({ notifications: normalized });
  } catch (error) {
    console.log("Failed to sync notification preferences:", error);
  }
  return normalized;
};

export const shouldShowClientNotification = (
  notificationType: string | undefined,
  prefs: DeliveryNotificationPreferences
) => {
  const type = String(notificationType || "").toUpperCase();

  // Account deletion notifications are always shown regardless of preferences
  if (type === "ACCOUNT_DELETION_APPROVED" || type === "ACCOUNT_DELETION_REJECTED") {
    return true;
  }

  if (type === "PAYOUT_PAID") {
    return prefs.payoutAlerts;
  }
  if (type === "PROMOTION" || type === "PROMOTIONS") {
    return prefs.promotionAlerts;
  }
  if (type === "OFFER" || type === "OFFERS") {
    return prefs.offerAlerts;
  }
  if (
    type === "DELIVERY_JOB_READY" ||
    type === "DELIVERY_ASSIGNED" ||
    type === "DELIVERY_STATUS" ||
    type === "DELIVERY_REUPLOAD"
  ) {
    return prefs.jobAlerts;
  }

  return prefs.jobAlerts;
};
