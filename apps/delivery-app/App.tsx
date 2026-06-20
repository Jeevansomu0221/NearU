import React from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import crashlytics from "@react-native-firebase/crashlytics";
import AppNavigator from "./src/navigation/AppNavigator";
import CustomAlert, { initCustomAlert } from "./src/components/CustomAlert";
import { registerForPushNotifications, setupNotificationHandlers } from "./src/services/notifications";

initCustomAlert();
const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  React.useEffect(() => {
    crashlytics().setCrashlyticsCollectionEnabled(typeof __DEV__ === "undefined" || !__DEV__);
    registerForPushNotifications().catch((error) => {
      console.log("Failed to register push notifications:", error);
    });
    return setupNotificationHandlers(navigationRef);
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
        <CustomAlert />
        <StatusBar style="light" backgroundColor="#16A34A" translucent={false} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
