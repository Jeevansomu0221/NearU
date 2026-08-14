import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccessToken } from "../utils/authStorage";
import { Alert, AppState, PermissionsAndroid, Platform } from "react-native";
import api from "../api/client";
import { notifyDeletionRequestRefresh, applyDeletionStatusFromNotification } from "../api/accountDeletion.api";
import { notifyReviewStatusRefresh } from "./reviewStatusRefresh";

const NOTIFICATION_APP = "partner";
const TOKEN_STORAGE_KEY = "notification:fcmToken:partner";

let messagingInstance: any | null | undefined;
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

const getMessagingInstance = () => {
  if (messagingInstance !== undefined) return messagingInstance;

  const pkg = getMessagingPackage();
  if (!pkg?.getMessaging) {
    messagingInstance = null;
    return null;
  }

  try {
    messagingInstance = pkg.getMessaging();
    return messagingInstance;
  } catch (error: any) {
    console.log("Firebase Messaging is unavailable in this build. Rebuild the native app to enable push notifications.", error?.message || error);
    messagingInstance = null;
    return null;
  }
};

const getAuthorizationStatus = () => getMessagingPackage()?.AuthorizationStatus;

const setupBackgroundHandler = () => {
  const pkg = getMessagingPackage();
  const messaging = getMessagingInstance();
  if (!pkg || !messaging || didSetBackgroundHandler) return;

  pkg.setBackgroundMessageHandler(messaging, async () => {
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
  const pkg = getMessagingPackage();
  const messaging = getMessagingInstance();
  const AuthorizationStatus = getAuthorizationStatus();
  if (!pkg || !messaging || !AuthorizationStatus) return false;

  const androidPermission = await requestAndroidNotificationPermission();
  if (!androidPermission) return false;
  if (Platform.OS === "android") return true;

  const status = await pkg.requestPermission(messaging);
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
};

const postToken = async (token: string) => {
  const authToken = await getAccessToken();
  if (!authToken || !token) {
    console.log("[notifications:partner] Skipped token upload — missing auth or FCM token");
    return false;
  }

  try {
    await api.post("/notifications/register-token", {
      token,
      app: NOTIFICATION_APP,
      platform: Platform.OS
    });
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    return true;
  } catch (error: any) {
    console.log(
      "[notifications:partner] Failed to register token:",
      error?.response?.data?.message || error?.message || error
    );
    return false;
  }
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
    navigationRef.navigate("PaymentHistory");
    return true;
  }

  const orderId = data?.orderId || data?.jobId;
  if (orderId) {
    navigationRef.navigate("OrderDetails", { orderId: String(orderId) });
    return true;
  }

  if (data?.type === "PARTNER_REUPLOAD") {
    navigationRef.navigate("Settings");
    return true;
  }

  navigationRef.navigate("Dashboard");
  return true;
};

const isDeletionNotification = (data?: Record<string, any> | null) =>
  data?.type === "ACCOUNT_DELETION_APPROVED" || data?.type === "ACCOUNT_DELETION_REJECTED";

const isVerificationStatusNotification = (data?: Record<string, any> | null) =>
  data?.type === "PARTNER_STATUS" || data?.type === "PARTNER_REUPLOAD";

const acknowledgeVerificationStatusNotification = () => {
  notifyReviewStatusRefresh();
};

const showForegroundAlert = (navigationRef: any, remoteMessage: any) => {
  const title = remoteMessage?.notification?.title || "Notification";
  const body = remoteMessage?.notification?.body || "You have a new update.";

  if (isDeletionNotification(remoteMessage?.data)) {
    Alert.alert(title, body, [
      {
        text: "OK",
        onPress: () => void handleDeletionNotification(navigationRef, remoteMessage?.data)
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

  Alert.alert(title, body, [
    { text: "Later", style: "cancel" },
    {
      text: "View",
      onPress: () => navigateFromData(navigationRef, remoteMessage?.data)
    }
  ]);
};

export const setupEarlyNotificationHandlers = () => {
  setupBackgroundHandler();
};

export const subscribePushRegistrationRefresh = () => {
  const subscription = AppState.addEventListener("change", (nextState) => {
    if (nextState === "active") {
      registerForPushNotifications().catch((error) => {
        console.log("[notifications:partner] Foreground token refresh failed:", error);
      });
    }
  });
  return () => subscription.remove();
};

export const registerForPushNotifications = async () => {
  const token = await getAccessToken();
  if (!token) {
    console.log("[notifications:partner] Skipped registration — user not logged in");
    return false;
  }

  setupBackgroundHandler();
  const pkg = getMessagingPackage();
  const messaging = getMessagingInstance();
  if (!pkg || !messaging) {
    console.log("[notifications:partner] Firebase Messaging native module unavailable — rebuild the app");
    return false;
  }

  const permitted = await hasNotificationPermission();
  if (!permitted) {
    console.log("[notifications:partner] Notification permission not granted");
    return false;
  }

  if (!pkg.isDeviceRegisteredForRemoteMessages(messaging)) {
    await pkg.registerDeviceForRemoteMessages(messaging);
  }

  const fcmToken = await pkg.getToken(messaging);
  return postToken(fcmToken);
};

export const unregisterPushNotifications = async () => {
  const fcmToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  if (!fcmToken) return;

  try {
    await api.request({
      method: "DELETE",
      url: "/notifications/token",
      data: {
        token: fcmToken,
        app: NOTIFICATION_APP
      }
    } as any);
  } finally {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const setupNotificationHandlers = (navigationRef: any) => {
  setupBackgroundHandler();
  const pkg = getMessagingPackage();
  const messaging = getMessagingInstance();
  if (!pkg || !messaging) return () => {};

  const unsubscribeMessage = pkg.onMessage(messaging, async (remoteMessage: any) => {
    if (isDeletionNotification(remoteMessage?.data)) {
      const updated = await applyDeletionStatusFromNotification(remoteMessage?.data);
      notifyDeletionRequestRefresh(updated);
    }
    showForegroundAlert(navigationRef, remoteMessage);
  });

  const unsubscribeOpened = pkg.onNotificationOpenedApp(messaging, (remoteMessage: any) => {
    navigateFromData(navigationRef, remoteMessage?.data);
  });

  const unsubscribeTokenRefresh = pkg.onTokenRefresh(messaging, (token: string) => {
    postToken(token).catch((error) => {
      console.log("Failed to refresh notification token:", error);
    });
  });

  pkg
    .getInitialNotification(messaging)
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
