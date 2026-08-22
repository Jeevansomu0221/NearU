import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, CaveatBrush_400Regular } from "@expo-google-fonts/caveat-brush";
import AppNavigator from "./src/navigation/AppNavigator";
import ResponsiveFrame from "./src/components/ResponsiveFrame";
import { CartProvider } from "./src/context/CartContext";
import CustomAlert, { initCustomAlert } from "./src/components/CustomAlert";
import { registerForPushNotifications, setupNotificationHandlers, subscribePushRegistrationRefresh } from "./src/services/notifications";
import { initCrashlytics } from "./src/utils/crashlytics";

// Initialize Custom Alert globally to override standard Alert.alert
initCustomAlert();
const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const [fontsLoaded] = useFonts({
    CaveatBrush_400Regular,
  });

  React.useEffect(() => {
    initCrashlytics().catch(() => {});
    registerForPushNotifications().catch((error) => {
      console.log("Failed to register push notifications:", error);
    });
    const unsubscribePushRefresh = subscribePushRegistrationRefresh();
    const unsubscribeHandlers = setupNotificationHandlers(navigationRef);
    return () => {
      unsubscribePushRefresh();
      unsubscribeHandlers();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator color="#e23744" />
      </View>
    );
  }

  return (
    <CartProvider>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <ResponsiveFrame>
            <AppNavigator />
          </ResponsiveFrame>
          <CustomAlert />
        </NavigationContainer>
      </SafeAreaProvider>
    </CartProvider>
  );
}
