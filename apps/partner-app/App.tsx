import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { useEffect } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import CustomAlert from "./src/components/CustomAlert";
import PartnerOrderWatcher from "./src/components/PartnerOrderWatcher";
import { PartnerThemeProvider, usePartnerTheme } from "./src/context/PartnerThemeContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { registerForPushNotifications, setupNotificationHandlers } from "./src/services/notifications";

const navigationRef = createNavigationContainerRef();

function PartnerAppContent() {
  const { theme, isDarkMode } = usePartnerTheme();

  useEffect(() => {
    registerForPushNotifications().catch((error) => {
      console.log("Failed to register push notifications:", error);
    });
    return setupNotificationHandlers(navigationRef);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.background}
          translucent={false}
        />
        <NavigationContainer
          ref={navigationRef}
          theme={{
            dark: isDarkMode,
            colors: {
              primary: theme.colors.primary,
              background: theme.colors.background,
              card: theme.colors.card,
              text: theme.colors.primaryDark,
              border: theme.colors.border,
              notification: theme.colors.primary
            },
            fonts: {
              regular: { fontFamily: "System", fontWeight: "400" },
              medium: { fontFamily: "System", fontWeight: "500" },
              bold: { fontFamily: "System", fontWeight: "700" },
              heavy: { fontFamily: "System", fontWeight: "900" }
            }
          }}
        >
          <AppNavigator />
        </NavigationContainer>
        <CustomAlert />
        <PartnerOrderWatcher navigationRef={navigationRef} />
      </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PartnerThemeProvider>
        <PartnerAppContent />
      </PartnerThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
