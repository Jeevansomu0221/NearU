import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

// Import screens
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

// Define interfaces for API responses
interface PartnerStatusData {
  _id: string;
  status: string;
  hasCompletedSetup?: boolean;
  menuItemsCount: number;
  restaurantName?: string;
  ownerName?: string;
  phone?: string;
}

interface PartnerStatusSuccessResponse {
  success: true;
  data: PartnerStatusData;
}

interface PartnerStatusErrorResponse {
  success: false;
  message: string;
}

type PartnerStatusResponse = PartnerStatusSuccessResponse | PartnerStatusErrorResponse;

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<string>("Loading");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const [token, phone] = await Promise.all([
        AsyncStorage.getItem("token"),
        AsyncStorage.getItem("phone"),
      ]);
      
      console.log("🔍 Auth check:", { hasToken: !!token, hasPhone: !!phone });
      
      if (!token || !phone) {
        console.log("📝 No auth data, redirecting to Login");
        setInitialRoute("Login");
        setLoading(false);
        return;
      }
      
      // Check partner status
      await checkPartnerStatus();
    } catch (error) {
      console.error("❌ Auth check error:", error);
      setInitialRoute("Login");
      setLoading(false);
    }
  };

  const checkPartnerStatus = async () => {
    try {
      console.log("🔍 Checking partner status...");
      
      const response = await api.get<PartnerStatusResponse>("/partners/my-status");
      const responseData = response.data;
      
      console.log("✅ Partner status response:", responseData);
      
      // Check if the response indicates no partner found
      if (!responseData.success) {
        console.log("📝 Partner not found - message:", responseData.message);
        // If partner not found, go to onboarding
        setInitialRoute("Onboarding");
        setLoading(false);
        return;
      }
      
      // At this point, we know responseData has the 'data' property
      const partnerData = responseData.data;
      
      // Determine initial route based on partner status
      switch (partnerData.status) {
        case "PENDING":
          console.log("📝 Status: PENDING");
          setInitialRoute("PendingApproval");
          break;
        case "APPROVED":
          console.log("✅ Status: APPROVED", { 
            hasCompletedSetup: partnerData.hasCompletedSetup, 
            menuItemsCount: partnerData.menuItemsCount 
          });
          // Check if they've completed setup or have menu items
          if (partnerData.hasCompletedSetup || (partnerData.menuItemsCount && partnerData.menuItemsCount > 0)) {
            setInitialRoute("Dashboard");
          } else {
            setInitialRoute("WelcomeApproved");
          }
          break;
        case "REJECTED":
          console.log("❌ Status: REJECTED");
          setInitialRoute("Rejected");
          break;
        case "SUSPENDED":
          console.log("⚠️ Status: SUSPENDED");
          setInitialRoute("Login");
          break;
        default:
          console.log("❓ Unknown status:", partnerData.status);
          setInitialRoute("Onboarding");
      }
    } catch (error: any) {
      console.error("❌ Partner status check failed:", {
        message: error.message,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        console.log("🔒 Unauthorized - clearing auth data");
        await clearAuthData();
        setInitialRoute("Login");
      } else if (error.response?.status === 404) {
        console.log("📝 Partner not found - needs onboarding");
        // If partner not found (404), go to onboarding
        setInitialRoute("Onboarding");
      } else if (!error.response) {
        console.log("🌐 Network error - check backend connection");
        setInitialRoute("Login");
      } else {
        console.log("⚠️ Other error, redirecting to Onboarding");
        setInitialRoute("Onboarding");
      }
    } finally {
      setLoading(false);
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "phone", "userId", "partnerId"]);
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  };

  if (loading || initialRoute === "Loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F3EE" }}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#6B5E55" }}>
          Loading your account...
        </Text>
      </View>
    );
  }

  return (
    <Stack.Navigator 
      initialRouteName={initialRoute}
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFF8F1",
        },
        headerTintColor: "#2C2018",
        headerTitleStyle: {
          fontWeight: "700",
        },
        headerBackTitle: "Back",
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: "#F7F3EE"
        }
      }}
    >
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
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: "Settings" }}
      />
    </Stack.Navigator>
  );
}
