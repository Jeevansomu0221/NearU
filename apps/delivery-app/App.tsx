import React from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import CustomAlert, { initCustomAlert } from "./src/components/CustomAlert";
import { registerForPushNotifications, setupNotificationHandlers } from "./src/services/notifications";

initCustomAlert();
const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  React.useEffect(() => {
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
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
