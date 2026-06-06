import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking, Platform } from "react-native";
import api from "../api/client";

const NOTIFICATION_APP = "delivery";
const TOKEN_STORAGE_KEY = "notification:fcmToken:delivery";

let messagingModule: any | null | undefined;
let didSetBackgroundHandler = false;

const getMessagingModule = () => {
  if (messagingModule !== undefined) return messagingModule;

  try {
    messagingModule = require("@react-native-firebase/messaging").default;
    return messagingModule;
  } catch (error: any) {
    console.log("Firebase Messaging native module is not ready. Rebuild the native app to enable push notifications.", error?.message || error);
    messagingModule = null;
    return null;
  }
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

const setupBackgroundHandler = () => {
  const messaging = getMessaging();
  if (!messaging || didSetBackgroundHandler) return;

  messaging.setBackgroundMessageHandler(async () => {
    // FCM displays notification payloads for background messages.
  });
  didSetBackgroundHandler = true;
};

const hasNotificationPermission = async () => {
  const messagingModule = getMessagingModule();
  const messaging = getMessaging();
  if (!messaging || !messagingModule) return false;

  const status = await messaging.requestPermission();
  return (
    status === messagingModule.AuthorizationStatus.AUTHORIZED ||
    status === messagingModule.AuthorizationStatus.PROVISIONAL
  );
};

const postToken = async (token: string) => {
  const authToken = await AsyncStorage.getItem("token");
  if (!authToken || !token) return;

  await api.post("/notifications/register-token", {
    token,
    app: NOTIFICATION_APP,
    platform: Platform.OS
  });
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
};

const navigateFromData = (navigationRef: any, data?: Record<string, any> | null) => {
  if (!navigationRef?.isReady?.()) return false;

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

const showForegroundAlert = (navigationRef: any, remoteMessage: any) => {
  const title = remoteMessage?.notification?.title || "Notification";
  const body = remoteMessage?.notification?.body || "You have a new update.";

  Alert.alert(title, body, [
    { text: "Later", style: "cancel" },
    {
      text: "View",
      onPress: () => navigateFromData(navigationRef, remoteMessage?.data)
    }
  ]);
};

export const registerForPushNotifications = async () => {
  const token = await AsyncStorage.getItem("token");
  if (!token) return;

  setupBackgroundHandler();
  const messaging = getMessaging();
  if (!messaging) return;

  const permitted = await hasNotificationPermission();
  if (!permitted) return;

  if (!messaging.isDeviceRegisteredForRemoteMessages) {
    await messaging.registerDeviceForRemoteMessages();
  }

  const fcmToken = await messaging.getToken();
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

  const status = await messaging.hasPermission();
  if (status === messagingModule.AuthorizationStatus.AUTHORIZED) return "Notifications are enabled.";
  if (status === messagingModule.AuthorizationStatus.PROVISIONAL) return "Notifications are provisionally enabled.";
  return "Notifications are off. Enable them to receive job and payout alerts.";
};

export const openNotificationSettings = () => {
  Linking.openSettings().catch(() => {});
};

export const setupNotificationHandlers = (navigationRef: any) => {
  setupBackgroundHandler();
  const messaging = getMessaging();
  if (!messaging) return () => {};

  const unsubscribeMessage = messaging.onMessage(async (remoteMessage: any) => {
    showForegroundAlert(navigationRef, remoteMessage);
  });

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
    unsubscribeOpened();
    unsubscribeTokenRefresh();
  };
};
