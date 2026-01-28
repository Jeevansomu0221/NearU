// apps/partner-app/src/navigation/AppNavigator.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "../screens/LoginScreen";
import OrdersScreen from "../screens/OrdersScreen";
import OrderDetailsScreen from "../screens/OrderDetailsScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import MenuScreen from "../screens/MenuScreen";
import PendingApprovalScreen from "../screens/PendingApprovalScreen";
import RejectedScreen from "../screens/RejectedScreen";
import ProfileScreen from "../screens/ProfileScreen";

import WelcomeApprovedScreen from "../screens/WelcomeApprovedScreen";
import DashboardScreen from "../screens/DashboardScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const phone = await AsyncStorage.getItem("phone");
      
      if (!token || !phone) {
        setInitialRoute("Login");
      } else {
        // Check partner status
        checkPartnerStatus(phone);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setInitialRoute("Login");
    } finally {
      setLoading(false);
    }
  };

  const checkPartnerStatus = async (phone: string) => {
    try {
      // You'll need to implement this API call
      // const res = await api.get(`/partners/status/${phone}`);
      // Based on status, set initial route
      setInitialRoute("Orders"); // Temporary
    } catch (error) {
      setInitialRoute("Login");
    }
  };

  if (loading || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRoute}>
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PendingApproval" 
        component={PendingApprovalScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Rejected" 
        component={RejectedScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Orders" 
        component={OrdersScreen} 
        options={{ title: "Orders" }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen} 
        options={{ title: "Order Details" }}
      />
      <Stack.Screen 
        name="Menu" 
        component={MenuScreen} 
        options={{ title: "Menu Management" }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: "Profile" }}
      />
      <Stack.Screen 
  name="WelcomeApproved" 
  component={WelcomeApprovedScreen} 
  options={{ headerShown: false }}
/>
<Stack.Screen 
  name="Dashboard" 
  component={DashboardScreen} 
  options={{ title: "Dashboard" }}
/>
<Stack.Screen 
  name="Settings" 
  component={SettingsScreen} 
  options={{ title: "Settings" }}
/>
    </Stack.Navigator>
  );
}