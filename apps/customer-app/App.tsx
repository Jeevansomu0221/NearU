import React from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { CartProvider } from "./src/context/CartContext";
import CustomAlert, { initCustomAlert } from "./src/components/CustomAlert";
import { registerForPushNotifications, setupNotificationHandlers } from "./src/services/notifications";

// Initialize Custom Alert globally to override standard Alert.alert
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
    <CartProvider>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
          <CustomAlert />
        </NavigationContainer>
      </SafeAreaProvider>
    </CartProvider>
  );
}
