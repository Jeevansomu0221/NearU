import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccessToken } from "../utils/authStorage";
import { Alert, Linking, PermissionsAndroid, Platform, Vibration } from "react-native";
import api from "../api/client";
import { acceptJob, rejectJob } from "../api/delivery.api";
import {
  getNotificationPreferences,
  shouldShowClientNotification
} from "./notificationPreferences";
import { notifyDeletionRequestRefresh, applyDeletionStatusFromNotification } from "../api/accountDeletion.api";
import { notifyReviewStatusRefresh } from "./reviewStatusRefresh";

const NOTIFICATION_APP = "delivery";
const TOKEN_STORAGE_KEY = "notification:fcmToken:delivery";
const ANDROID_NOTIFICATION_CHANNEL_ID = "vyaha_alerts";
const DELIVERY_ACCEPT_ACTION = "delivery_accept";
const DELIVERY_REJECT_ACTION = "delivery_reject";
const DELIVERY_VIEW_ACTION = "delivery_view";

let messagingModule: any | null | undefined;
let didSetBackgroundHandler = false;
let notifeeModule: any | null | undefined;
let didSetNotificationActionHandlers = false;
let messagingPackage: any | null | undefined;

const getMessagingPackage = () => {
  if (messagingPackage !== undefined) return messagingPackage;

  try {
    messagingPackage = require("@react-native-firebase/messaging");
    return messagingPackage;
  } catch (error: any) {
    console.log("Firebase Messaging native module is not ready. Rebuild the native app to enable push notifications.", error?.message || error);
    messagingPackage = null;
    return null;
  }
};

const getMessagingModule = () => {
  if (messagingModule !== undefined) return messagingModule;

  const pkg = getMessagingPackage();
  if (!pkg) {
    messagingModule = null;
    return null;
  }

  messagingModule = pkg.default;
  return messagingModule;
};

const getMessaging = () => {
  const messaging = getMessagingModule();
  if (!messaging) return null;

  try {
    return messaging();
  } catch (error: any) {
    console.log("Firebase Messaging is unavailable in this build. Rebuild the native app to enable push notifications.", error?.message || error);
    return null;
  }
};

const getNotifeeModule = () => {
  if (notifeeModule !== undefined) return notifeeModule;

  try {
    notifeeModule = require("@notifee/react-native");
    return notifeeModule;
  } catch {
    notifeeModule = null;
    return null;
  }
};

const getNotifee = () => {
  const module = getNotifeeModule();
  return module?.default || null;
};

const isDeliveryJobMessage = (remoteMessage: any) =>
  remoteMessage?.data?.type === "DELIVERY_JOB_READY" || remoteMessage?.data?.notificationStyle === "DELIVERY_JOB_ACTIONS";

const getNotificationOrderId = (data?: Record<string, any> | null) => {
  const orderId = data?.orderId || data?.jobId;
  return orderId ? String(orderId) : "";
};

const buildDeliveryJobNotificationCopy = (remoteMessage: any) => {
  const data = remoteMessage?.data || {};
  const title = remoteMessage?.notification?.title || `New delivery job${data.earnings ? ` - Rs ${data.earnings}` : ""}`;
  const body =
    remoteMessage?.notification?.body ||
    [
      `Pickup: ${data.restaurantName || "Restaurant"}${data.pickupAddress ? ` - ${data.pickupAddress}` : ""}`,
      `Drop: ${data.customerName || "Customer"}${data.dropAddress ? ` - ${data.dropAddress}` : ""}`,
      data.earnings ? `Earn Rs ${data.earnings}${data.orderTotal ? ` | Order Rs ${data.orderTotal}` : ""}${data.paymentLabel ? ` | ${data.paymentLabel}` : ""}` : ""
    ].filter(Boolean).join("\n");

  return { title, body };
};

const setupBackgroundHandler = () => {
  const messaging = getMessaging();
  if (!messaging || didSetBackgroundHandler) return;

  messaging.setBackgroundMessageHandler(async (remoteMessage: any) => {
    await displayDeliveryJobNotification(remoteMessage);
  });
  didSetBackgroundHandler = true;
};

const getAndroidNotificationPermission = () => {
  if (Platform.OS !== "android" || Number(Platform.Version) < 33) return null;
  return (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS || null;
};

const requestAndroidNotificationPermission = async () => {
  const permission = getAndroidNotificationPermission();
  if (!permission) return true;

  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) return true;

  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

const hasNotificationPermission = async () => {
  const messagingModule = getMessagingModule();
  const messaging = getMessaging();
  if (!messaging || !messagingModule) return false;

  const androidPermission = await requestAndroidNotificationPermission();
  if (!androidPermission) return false;
  if (Platform.OS === "android") return true;

  const messagingPkg = getMessagingPackage();
  const status =
    typeof messagingPkg?.requestPermission === "function"
      ? await messagingPkg.requestPermission(messaging)
      : await messaging.requestPermission();
  return (
    status === messagingModule.AuthorizationStatus.AUTHORIZED ||
    status === messagingModule.AuthorizationStatus.PROVISIONAL
  );
};

const postToken = async (token: string) => {
  const authToken = await getAccessToken();
  if (!authToken || !token) return;

  await api.post("/notifications/register-token", {
    token,
    app: NOTIFICATION_APP,
    platform: Platform.OS
  });
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
};

const handleDeletionNotification = async (navigationRef: any, data?: Record<string, any> | null) => {
  const updated = await applyDeletionStatusFromNotification(data as Record<string, string> | null);
  notifyDeletionRequestRefresh(updated);

  const isApproved = data?.type === "ACCOUNT_DELETION_APPROVED";
  if (isApproved && navigationRef?.isReady?.()) {
    navigationRef.navigate("AccountDeletionReview");
  }
};

const navigateFromData = async (navigationRef: any, data?: Record<string, any> | null) => {
  if (!navigationRef?.isReady?.()) return false;

  if (
    data?.type === "ACCOUNT_DELETION_APPROVED" ||
    data?.type === "ACCOUNT_DELETION_REJECTED"
  ) {
    await handleDeletionNotification(navigationRef, data);
    return true;
  }

  if (data?.type === "PAYOUT_PAID") {
    navigationRef.navigate("Main", { screen: "Earnings" });
    return true;
  }

  const orderId = data?.orderId || data?.jobId;
  if (orderId) {
    navigationRef.navigate("JobDetails", { orderId: String(orderId) });
    return true;
  }

  if (data?.type === "DELIVERY_STATUS" || data?.type === "DELIVERY_REUPLOAD") {
    navigationRef.navigate("ReviewStatus");
    return true;
  }

  navigationRef.navigate("Main", { screen: "Jobs" });
  return true;
};

const displayDeliveryJobNotification = async (remoteMessage: any) => {
  if (!isDeliveryJobMessage(remoteMessage)) return false;

  const prefs = await getNotificationPreferences();
  if (!shouldShowClientNotification(remoteMessage?.data?.type || "DELIVERY_JOB_READY", prefs)) {
    return false;
  }

  const notifee = getNotifee();
  if (!notifee) return false;

  const module = getNotifeeModule();
  const AndroidImportance = module?.AndroidImportance;
  const { title, body } = buildDeliveryJobNotificationCopy(remoteMessage);
  const data = Object.entries(remoteMessage?.data || {}).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = String(value);
    }
    return acc;
  }, {});

  const channelId = Platform.OS === "android"
    ? await notifee.createChannel({
        id: ANDROID_NOTIFICATION_CHANNEL_ID,
        name: "Vyaha Delivery alerts",
        importance: AndroidImportance?.HIGH ?? 4,
        vibration: prefs.vibrationEnabled,
        vibrationPattern: prefs.vibrationEnabled ? [250, 250, 250, 250] : undefined,
        sound: "default"
      })
    : ANDROID_NOTIFICATION_CHANNEL_ID;

  await notifee.displayNotification({
    id: `delivery-job-${getNotificationOrderId(data) || Date.now()}`,
    title,
    body,
    data,
    android: {
      channelId,
      smallIcon: "vyaha_notification_icon",
      color: "#0F9D58",
      pressAction: { id: "default" },
      actions: [
        { title: "Accept", pressAction: { id: DELIVERY_ACCEPT_ACTION } },
        { title: "Reject", pressAction: { id: DELIVERY_REJECT_ACTION } },
        { title: "View", pressAction: { id: DELIVERY_VIEW_ACTION } }
      ]
    },
    ios: {
      categoryId: "delivery_job_actions"
    }
  });

  if (prefs.vibrationEnabled) {
    Vibration.vibrate(250);
  }

  return true;
};

const displayActionResultNotification = async (title: string, body: string, data?: Record<string, any>) => {
  const notifee = getNotifee();
  if (!notifee) return;

  await notifee.displayNotification({
    title,
    body,
    data: Object.entries(data || {}).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value !== undefined && value !== null) acc[key] = String(value);
      return acc;
    }, {}),
    android: {
      channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
      smallIcon: "vyaha_notification_icon",
      color: "#0F9D58",
      pressAction: { id: "default" }
    }
  });
};

const handleDeliveryNotificationAction = async (
  pressActionId: string | undefined,
  data?: Record<string, any> | null,
  navigationRef?: any
) => {
  const orderId = getNotificationOrderId(data);
  if (!orderId) return;

  if (pressActionId === DELIVERY_ACCEPT_ACTION) {
    const response = await acceptJob(orderId);
    if (response.success) {
      await displayActionResultNotification("Delivery accepted", "Open the app to continue pickup.", {
        ...data,
        orderId,
        jobId: orderId
      });
      navigateFromData(navigationRef, { ...data, orderId, jobId: orderId });
    } else {
      await displayActionResultNotification("Could not accept job", response.message || "Please open the app and try again.", data || undefined);
    }
    return;
  }

  if (pressActionId === DELIVERY_REJECT_ACTION) {
    const response = await rejectJob(orderId);
    await displayActionResultNotification(
      response.success ? "Delivery rejected" : "Could not reject job",
      response.success ? "This job was removed from your available list." : response.message || "Please open the app and try again.",
      data || undefined
    );
    return;
  }

  navigateFromData(navigationRef, data);
};

export const setupNotificationActionHandlers = () => {
  const notifee = getNotifee();
  if (!notifee || didSetNotificationActionHandlers) return;

  notifee.setNotificationCategories?.([
    {
      id: "delivery_job_actions",
      actions: [
        { id: DELIVERY_ACCEPT_ACTION, title: "Accept" },
        { id: DELIVERY_REJECT_ACTION, title: "Reject", destructive: true },
        { id: DELIVERY_VIEW_ACTION, title: "View" }
      ]
    }
  ]).catch?.(() => {});

  const module = getNotifeeModule();
  const EventType = module?.EventType || {};
  notifee.onBackgroundEvent(async ({ type, detail }: any) => {
    if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) return;
    await handleDeliveryNotificationAction(detail?.pressAction?.id, detail?.notification?.data);
  });
  didSetNotificationActionHandlers = true;
};

const setupForegroundNotificationActionHandler = (navigationRef: any) => {
  const notifee = getNotifee();
  if (!notifee) return () => {};

  const module = getNotifeeModule();
  const EventType = module?.EventType || {};
  return notifee.onForegroundEvent(({ type, detail }: any) => {
    if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) return;
    handleDeliveryNotificationAction(detail?.pressAction?.id, detail?.notification?.data, navigationRef).catch((error) => {
      console.log("Failed to handle notification action:", error);
    });
  });
};

const isDeletionNotification = (data?: Record<string, any> | null) =>
  data?.type === "ACCOUNT_DELETION_APPROVED" || data?.type === "ACCOUNT_DELETION_REJECTED";

const isVerificationStatusNotification = (data?: Record<string, any> | null) =>
  data?.type === "DELIVERY_STATUS" || data?.type === "DELIVERY_REUPLOAD";

const acknowledgeDeletionNotification = (navigationRef: any, data?: Record<string, any> | null) => {
  void handleDeletionNotification(navigationRef, data);
};

const acknowledgeVerificationStatusNotification = () => {
  notifyReviewStatusRefresh();
};

const showForegroundAlert = async (navigationRef: any, remoteMessage: any) => {
  const prefs = await getNotificationPreferences();
  if (!shouldShowClientNotification(remoteMessage?.data?.type, prefs)) {
    return;
  }

  const title = remoteMessage?.notification?.title || "Notification";
  const body = remoteMessage?.notification?.body || "You have a new update.";
  const orderId = getNotificationOrderId(remoteMessage?.data);

  if (isDeletionNotification(remoteMessage?.data)) {
    Alert.alert(title, body, [
      {
        text: "OK",
        onPress: () => acknowledgeDeletionNotification(navigationRef, remoteMessage?.data)
      }
    ]);
    return;
  }

  if (isVerificationStatusNotification(remoteMessage?.data)) {
    Alert.alert(title, body, [
      {
        text: "OK",
        onPress: () => acknowledgeVerificationStatusNotification()
      }
    ]);
    return;
  }

  const actions: any[] = [
    { text: "Later", style: "cancel" },
    {
      text: "View",
      onPress: () => navigateFromData(navigationRef, remoteMessage?.data)
    }
  ];

  if (isDeliveryJobMessage(remoteMessage) && orderId) {
    actions.splice(1, 0,
      {
        text: "Reject",
        style: "destructive",
        onPress: () => rejectJob(orderId).catch(() => {})
      },
      {
        text: "Accept",
        onPress: async () => {
          const response = await acceptJob(orderId);
          if (response.success) {
            navigateFromData(navigationRef, remoteMessage?.data);
            return;
          }
          Alert.alert("Could not accept job", response.message || "Please try again.");
        }
      }
    );
  }

  Alert.alert(title, body, actions);
};

export const registerForPushNotifications = async () => {
  const token = await getAccessToken();
  if (!token) return;

  setupNotificationActionHandlers();
  setupBackgroundHandler();
  const messaging = getMessaging();
  if (!messaging) return;

  const permitted = await hasNotificationPermission();
  if (!permitted) return;

  if (!messaging.isDeviceRegisteredForRemoteMessages) {
    await messaging.registerDeviceForRemoteMessages();
  }

  const messagingPkg = getMessagingPackage();
  const fcmToken =
    typeof messagingPkg?.getToken === "function"
      ? await messagingPkg.getToken(messaging)
      : await messaging.getToken();
  await postToken(fcmToken);
};

export const unregisterPushNotifications = async () => {
  const fcmToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  if (!fcmToken) return;

  try {
    await api.delete("/notifications/token", {
      data: {
        token: fcmToken,
        app: NOTIFICATION_APP
      }
    });
  } finally {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const getNotificationPermissionLabel = async () => {
  const messagingModule = getMessagingModule();
  const messaging = getMessaging();
  if (!messaging || !messagingModule) {
    return "Notifications require a rebuilt app with Firebase Messaging installed.";
  }

  const androidPermission = getAndroidNotificationPermission();
  if (androidPermission) {
    const granted = await PermissionsAndroid.check(androidPermission);
    return granted ? "Notifications are enabled." : "Notifications are off. Enable them to receive delivery job alerts.";
  }

  const messagingPkg = getMessagingPackage();
  const status =
    typeof messagingPkg?.hasPermission === "function"
      ? await messagingPkg.hasPermission(messaging)
      : await messaging.hasPermission();
  if (status === messagingModule.AuthorizationStatus.AUTHORIZED) return "Notifications are enabled.";
  if (status === messagingModule.AuthorizationStatus.PROVISIONAL) return "Notifications are provisionally enabled.";
  return "Notifications are off. Enable them to receive job and payout alerts.";
};

export const openNotificationSettings = () => {
  Linking.openSettings().catch(() => {});
};

export const setupNotificationHandlers = (navigationRef: any) => {
  setupNotificationActionHandlers();
  setupBackgroundHandler();
  const messaging = getMessaging();
  if (!messaging) return () => {};

  const unsubscribeMessage = messaging.onMessage(async (remoteMessage: any) => {
    if (await displayDeliveryJobNotification(remoteMessage)) {
      return;
    }
    if (isDeletionNotification(remoteMessage?.data)) {
      const updated = await applyDeletionStatusFromNotification(remoteMessage?.data);
      notifyDeletionRequestRefresh(updated);
    }
    await showForegroundAlert(navigationRef, remoteMessage);
  });

  const unsubscribeNotifeeForeground = setupForegroundNotificationActionHandler(navigationRef);

  const unsubscribeOpened = messaging.onNotificationOpenedApp((remoteMessage: any) => {
    navigateFromData(navigationRef, remoteMessage?.data);
  });

  const unsubscribeTokenRefresh = messaging.onTokenRefresh((token: string) => {
    postToken(token).catch((error) => {
      console.log("Failed to refresh notification token:", error);
    });
  });

  messaging
    .getInitialNotification()
    .then((remoteMessage: any) => {
      if (remoteMessage) {
        setTimeout(() => navigateFromData(navigationRef, remoteMessage.data), 500);
      }
    })
    .catch(() => {});

  return () => {
    unsubscribeMessage();
    unsubscribeNotifeeForeground();
    unsubscribeOpened();
    unsubscribeTokenRefresh();
  };
};
