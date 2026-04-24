import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import screens
import LoginScreen from "../screens/LoginScreen";
import OtpScreen from "../screens/OtpScreen";
import JobsScreen from "../screens/JobsScreen";
import MyJobsScreen from "../screens/MyJobsScreen";
import JobDetailsScreen from "../screens/JobDetailsScreen"; // Make sure this import exists
import EarningsScreen from "../screens/EarningsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ReviewStatusScreen from "../screens/ReviewStatusScreen";
import { getDeliveryProfile } from "../api/profile.api";
import { resolveDeliveryRoute } from "../utils/deliveryStatus";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator (Main screen)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#eee",
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
  );
}

// Stack Navigator
export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState("Loading");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          setInitialRoute("Login");
          return;
        }

        const profileResponse = await getDeliveryProfile();
        if (profileResponse.success && profileResponse.data) {
          setInitialRoute(resolveDeliveryRoute(profileResponse.data));
          return;
        }

        await AsyncStorage.multiRemove(["token", "user"]);
        setInitialRoute("Login");
      } catch (error) {
        await AsyncStorage.multiRemove(["token", "user"]);
        setInitialRoute("Login");
      }
    };

    checkSession();
  }, []);

  if (initialRoute === "Loading") {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerStyle: {
          backgroundColor: "#4CAF50",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "600",
        },
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
        options={{ title: "Verify OTP" }}
      />
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CompleteProfile"
        component={ProfileScreen}
        initialParams={{ forceComplete: true }}
        options={{
          title: "Complete Registration",
          headerLeft: () => null
        }}
      />
      <Stack.Screen
        name="ReviewStatus"
        component={ReviewStatusScreen}
        options={{
          title: "Verification Status",
          headerLeft: () => null
        }}
      />
      {/* ADD JobDetailsScreen as a separate screen */}
      <Stack.Screen
        name="JobDetails"
        component={JobDetailsScreen}
        options={{ title: "Job Details" }}
      />
    </Stack.Navigator>
  );
}
