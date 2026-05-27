import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { CartProvider } from "./src/context/CartContext";
import CustomAlert, { initCustomAlert } from "./src/components/CustomAlert";

// Initialize Custom Alert globally to override standard Alert.alert
initCustomAlert();

export default function App() {
  return (
    <CartProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
          <CustomAlert />
        </NavigationContainer>
      </SafeAreaProvider>
    </CartProvider>
  );
}
