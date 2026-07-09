import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, PermissionsAndroid, Platform } from "react-native";
import api from "../api/client";
import { getAccessToken } from "../utils/authStorage";

const NOTIFICATION_APP = "customer";
const TOKEN_STORAGE_KEY = "notification:fcmToken:customer";

let messagingModule: any | null | undefined;
let didSetBackgroundHandler = false;
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

const setupBackgroundHandler = () => {
  const messaging = getMessaging();
  if (!messaging || didSetBackgroundHandler) return;

  messaging.setBackgroundMessageHandler(async () => {
    // FCM displays notification payloads for background messages.
  });
  didSetBackgroundHandler = true;
};

const requestAndroidNotificationPermission = async () => {
  if (Platform.OS !== "android" || Number(Platform.Version) < 33) return true;

  const permission = (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS;
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

const navigateFromData = (navigationRef: any, data?: Record<string, any> | null) => {
  if (!navigationRef?.isReady?.()) return false;

  const orderId = data?.orderId || data?.jobId;
  if (orderId) {
    navigationRef.navigate("OrderStatus", { orderId: String(orderId) });
    return true;
  }

  navigationRef.navigate("Orders");
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
  const token = await getAccessToken();
  if (!token) return;

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
