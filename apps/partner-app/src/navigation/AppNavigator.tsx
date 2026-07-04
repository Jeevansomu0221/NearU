import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccessToken } from "../utils/authStorage";
import api, { bootstrapSessionRefresh } from "../api/client";
import { usePartnerTheme } from "../context/PartnerThemeContext";
import { clearAuthData } from "../utils/storage";
import {
  resolveStartupDeletionRequest,
  type AccountDeletionRequest
} from "../api/accountDeletion.api";

// Import screens
import LoginScreen from "../screens/LoginScreen";
import OrdersScreen from "../screens/OrdersScreen";
import OrderDetailsScreen from "../screens/OrderDetailsScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import MenuScreen from "../screens/MenuScreen";
import PendingApprovalScreen from "../screens/PendingApprovalScreen";
import ApplicationSubmittedScreen from "../screens/ApplicationSubmittedScreen";
import RejectedScreen from "../screens/RejectedScreen";
import SuspendedScreen from "../screens/SuspendedScreen";
import ProfileScreen from "../screens/ProfileScreen";
import WelcomeApprovedScreen from "../screens/WelcomeApprovedScreen";
import DashboardScreen from "../screens/DashboardScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AccountDeletionReviewScreen from "../screens/AccountDeletionReviewScreen";
import PaymentHistoryScreen from "../screens/PaymentHistoryScreen";
import ReviewsScreen from "../screens/ReviewsScreen";

const Stack = createNativeStackNavigator();
const logNavDebug = (...args: unknown[]) => {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log(...args);
  }
};

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
  const { theme } = usePartnerTheme();
  const [initialRoute, setInitialRoute] = useState<string>("Loading");
  const [startupDeletionRequest, setStartupDeletionRequest] = useState<AccountDeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const [token, phone] = await Promise.all([
        getAccessToken(),
        AsyncStorage.getItem("phone"),
      ]);
      
      logNavDebug("🔍 Auth check:", { hasToken: !!token, hasPhone: !!phone });
      
      if (!token || !phone) {
        logNavDebug("📝 No auth data, redirecting to Login");
        setInitialRoute("Login");
        setLoading(false);
        return;
      }
      await bootstrapSessionRefresh();
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
      logNavDebug("🔍 Checking partner status...");
      
      const response = await api.get<PartnerStatusResponse>("/partners/my-status");
      const responseData = response.data;
      
      logNavDebug("✅ Partner status response:", responseData);
      
      // Check if the response indicates no partner found
      if (!responseData.success) {
        logNavDebug("📝 Partner not found - message:", responseData.message);
        setInitialRoute("Onboarding");
        setLoading(false);
        return;
      }
      
      const partnerData = responseData.data;
      
      // Determine initial route based on partner status
      switch (partnerData.status) {
        case "PENDING":
          logNavDebug("📝 Status: PENDING");
          setInitialRoute("PendingApproval");
          break;
        case "APPROVED": {
          logNavDebug("✅ Status: APPROVED");
          // Check for an active deletion request before sending to Dashboard
          const deletionRequest = await resolveStartupDeletionRequest().catch(() => null);
          if (deletionRequest) {
            logNavDebug("🗑️ Active deletion request found, routing to AccountDeletionReview");
            setStartupDeletionRequest(deletionRequest);
            setInitialRoute("AccountDeletionReview");
          } else {
            setInitialRoute("Dashboard");
          }
          break;
        }
        case "REJECTED":
          logNavDebug("❌ Status: REJECTED");
          setInitialRoute("Rejected");
          break;
        case "SUSPENDED":
          logNavDebug("⚠️ Status: SUSPENDED");
          setInitialRoute("Suspended");
          break;
        default:
          logNavDebug("❓ Unknown status:", partnerData.status);
          setInitialRoute("Onboarding");
      }
    } catch (error: any) {
      console.error("❌ Partner status check failed:", {
        message: error.message,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
      
      if (error.response?.status === 401) {
        logNavDebug("🔒 Unauthorized - clearing auth data");
        await clearAuthData();
        setInitialRoute("Login");
      } else if (error.response?.status === 404) {
        logNavDebug("📝 Partner not found - needs onboarding");
        setInitialRoute("Onboarding");
      } else if (!error.response) {
        logNavDebug("🌐 Network error - keeping previous signed-in session");
        setInitialRoute("Dashboard");
      } else {
        logNavDebug("⚠️ Other error, redirecting to Dashboard");
        setInitialRoute("Dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || initialRoute === "Loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 20, fontSize: 16, color: theme.colors.muted }}>
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
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.primaryDark,
        headerTitleStyle: {
          fontWeight: "700",
        },
        headerBackTitle: "Back",
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.background
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
        name="ApplicationSubmitted"
        component={ApplicationSubmittedScreen}
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
        name="Suspended"
        component={SuspendedScreen}
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
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Orders" 
        component={OrdersScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen} 
        options={{ title: "Order Details" }}
      />
      <Stack.Screen 
        name="Menu" 
        component={MenuScreen} 
        options={{ headerShown: false }}
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
      <Stack.Screen 
        name="PaymentHistory" 
        component={PaymentHistoryScreen} 
        options={{ title: "Payment History" }}
      />
      <Stack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{ title: "Customer Reviews" }}
      />
      <Stack.Screen
        name="AccountDeletionReview"
        component={AccountDeletionReviewScreen}
        initialParams={
          startupDeletionRequest
            ? { initialRequest: startupDeletionRequest, isStartupRoute: true }
            : undefined
        }
        options={{ title: "Account Deletion" }}
      />
    </Stack.Navigator>
  );
}
