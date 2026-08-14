import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccessToken } from "../utils/authStorage";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountDeletionRequest } from "../api/accountDeletion.api";
import { resolveStartupDeletionRequest } from "../api/accountDeletion.api";

// Import screens
import LoginScreen from "../screens/LoginScreen";
import OtpScreen from "../screens/OtpScreen";
import JobsScreen from "../screens/JobsScreen";
import MyJobsScreen from "../screens/MyJobsScreen";
import JobDetailsScreen from "../screens/JobDetailsScreen"; // Make sure this import exists
import EarningsScreen from "../screens/EarningsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import KycRegistrationScreen from "../screens/KycRegistrationScreen";
import ReviewsScreen from "../screens/ReviewsScreen";
import ReviewStatusScreen from "../screens/ReviewStatusScreen";
import AccountDeletionReviewScreen from "../screens/AccountDeletionReviewScreen";
import { getDeliveryProfile } from "../api/profile.api";
import { resolveDeliveryRoute } from "../utils/deliveryStatus";
import { requestRiderLocationPermission, startRiderLocationWatch } from "../utils/riderLocation";
import AvailableJobsNewJobWatcher from "../components/AvailableJobsNewJobWatcher";
import { registerForPushNotifications } from "../services/notifications";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator (Main screen)
function MainTabs() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    requestRiderLocationPermission({ showDeniedAlert: true })
      .then((granted) => {
        if (granted) {
          void startRiderLocationWatch();
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#eee",
          height: 62 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
          tabBarLabel: "Available Jobs",
        }}
      />
      <Tab.Screen
        name="MyJobs"
        component={MyJobsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle" size={size} color={color} />
          ),
          tabBarLabel: "My Jobs",
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash" size={size} color={color} />
          ),
          tabBarLabel: "Earnings",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
    <AvailableJobsNewJobWatcher />
    </>
  );
}

// Stack Navigator
type StartupState =
  | { status: "loading" }
  | {
      status: "ready";
      route: string;
      deletionRequest?: AccountDeletionRequest;
    };

export default function AppNavigator() {
  const [startup, setStartup] = useState<StartupState>({ status: "loading" });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await getAccessToken();
        const cachedUser = await AsyncStorage.getItem("user");
        if (!token) {
          setStartup({ status: "ready", route: "Login" });
          return;
        }

        const [deletionRequest, profileResponse] = await Promise.all([
          resolveStartupDeletionRequest(),
          getDeliveryProfile().catch(() => ({ success: false as const }))
        ]);

        if (deletionRequest) {
          setStartup({
            status: "ready",
            route: "AccountDeletionReview",
            deletionRequest
          });
          return;
        }

        if (profileResponse.success && profileResponse.data) {
          setStartup({
            status: "ready",
            route: resolveDeliveryRoute(profileResponse.data)
          });
          registerForPushNotifications().catch(() => {});
          return;
        }

        if (cachedUser) {
          setStartup({ status: "ready", route: "Main" });
          registerForPushNotifications().catch(() => {});
          return;
        }

        setStartup({ status: "ready", route: "Main" });
        registerForPushNotifications().catch(() => {});
      } catch {
        setStartup({ status: "ready", route: "Main" });
      }
    };

    checkSession();
  }, []);

  if (startup.status === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingTitle}>Opening delivery app...</Text>
        <Text style={styles.loadingSubtitle}>Checking your session</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={startup.route}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Otp"
        component={OtpScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CompleteProfile"
        component={KycRegistrationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReviewStatus"
        component={ReviewStatusScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AccountDeletionReview"
        component={AccountDeletionReviewScreen}
        initialParams={
          startup.deletionRequest
            ? { initialRequest: startup.deletionRequest }
            : undefined
        }
        options={{
          headerShown: false,
          gestureEnabled: startup.route !== "AccountDeletionReview"
        }}
      />
      <Stack.Screen
        name="JobDetails"
        component={JobDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },
});
