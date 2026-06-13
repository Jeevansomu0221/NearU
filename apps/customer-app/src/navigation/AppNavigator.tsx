// apps/customer-app/src/navigation/AppNavigator.tsx
import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import HomeScreen from '../screens/HomeScreen';
import ShopDetailScreen from '../screens/ShopDetailScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from "../screens/ProfileScreen";
import OrderStatusScreen from "../screens/OrderStatusScreen";
import OrdersScreen from "../screens/OrdersScreen";
import SupportChatScreen from "../screens/SupportChatScreen";
import PaymentScreen from '../screens/PaymentScreen'; // Keep PaymentScreen
import { getUserProfile } from '../api/user.api';

// Define Address interface
export interface Address {
  _id?: string;
  label?: string;
  recipientName?: string;
  houseFlatDoorNo?: string;
  buildingApartmentName?: string;
  streetRoadName?: string;
  street?: string;
  state?: string;
  city?: string;
  cityTownVillage?: string;
  pincode?: string;
  area?: string;
  areaLocality?: string;
  colony?: string;
  roadStreet?: string;
  landmark?: string;
  district?: string;
  country?: string;
  nearbyPlaces?: string[];
  googleMapsLink?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

// Define Shop interface based on actual API response
export interface Shop {
  _id: string;
  shopName: string;
  restaurantName?: string; // Make optional
  category: string;
  address: string | Address; // Can be string or object
  isOpen: boolean;
  rating: number;
  shopImageUrl?: string;
  closingTime?: string;
  openingTime?: string;
  phone?: string;
}

// Define UserProfile for Payment screen
export interface UserProfile {
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: Address;
}

// Define OrderSummary for Payment screen
export interface OrderSummary {
  items: any[];
  subtotal: number;
  deliveryFee: number;
  foodGst?: number;
  deliveryGst?: number;
  platformFee?: number;
  taxDiscount?: number;
  deliveryDistanceKm?: number;
  total: number;
  address: string;
  deliveryLocation?: {
    latitude: number;
    longitude: number;
  };
  note?: string;
  groupedShops?: Array<{
    shopId: string;
    shopName: string;
    items: any[];
    subtotal: number;
    deliveryFee?: number;
    foodGst?: number;
    deliveryGst?: number;
    platformFee?: number;
    taxDiscount?: number;
    deliveryDistanceKm?: number;
  }>;
}

// Define stack param list - UPDATED (removed OrderSummary)
export type RootStackParamList = {
  Login: undefined;
  Otp: { phone: string };
  Home: undefined;
  ShopDetail: { 
    shopId: string;
    shop?: Shop;
    vegMode?: boolean;
  };
  Cart: {
    shop?: Shop;
  } | undefined;
  Profile: { forceComplete?: boolean } | undefined;
  OrderStatus: {
    orderId: string;
  };
  Orders: undefined;
  SupportChat: {
    mode: "chat" | "report";
    subject?: string;
  };
  Payment: { // Only Payment screen remains
    userProfile: UserProfile;
    orderSummary: OrderSummary;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

const isGeneratedCustomerName = (value?: string) => {
  const normalized = (value || "").trim().toLowerCase();
  return (
    normalized === "customer" ||
    normalized === "nearu customer" ||
    /^customer\s*\d{4}$/.test(normalized) ||
    /^customer\s+[0-9]+$/.test(normalized)
  );
};

const hasExactAddressPin = (address?: Address) =>
  typeof address?.latitude === "number" &&
  typeof address?.longitude === "number" &&
  Number.isFinite(address.latitude) &&
  Number.isFinite(address.longitude) &&
  !(address.latitude === 0 && address.longitude === 0);

const isCustomerProfileComplete = (profile: {
  name?: string;
  address?: Address;
  addresses?: Address[];
}) => {
  const hasRealName =
    !!profile.name &&
    !isGeneratedCustomerName(profile.name) &&
    profile.name.trim().length >= 3;

  const address = profile.address || profile.addresses?.find((entry) => entry.isDefault) || profile.addresses?.[0];
  const hasAddress =
    !!(address?.houseFlatDoorNo || address?.street) &&
    !!(address?.streetRoadName || address?.street) &&
    !!(address?.cityTownVillage || address?.city) &&
    !!address?.state &&
    !!address?.pincode &&
    !!(address?.areaLocality || address?.area) &&
    hasExactAddressPin(address);

  return Boolean(hasRealName && hasAddress);
};

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | 'Loading'>('Loading');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userJson = await AsyncStorage.getItem('user');

        if (!token) {
          setInitialRoute('Login');
          return;
        }

        const response = await getUserProfile();
        if (response.success && response.data) {
          setInitialRoute(isCustomerProfileComplete(response.data) ? 'Home' : 'Profile');
          return;
        }

        if (userJson) {
          const cachedUser = JSON.parse(userJson);
          setInitialRoute(isCustomerProfileComplete(cachedUser) ? 'Home' : 'Profile');
          return;
        }

        // Keep existing session on temporary backend failures.
        setInitialRoute('Home');
      } catch (error: any) {
        if (String(error?.message || "").toLowerCase().includes("session expired")) {
          setInitialRoute("Login");
          return;
        }

        try {
          const userJson = await AsyncStorage.getItem('user');
          if (userJson) {
            const cachedUser = JSON.parse(userJson);
            setInitialRoute(isCustomerProfileComplete(cachedUser) ? 'Home' : 'Profile');
            return;
          }
        } catch (_parseError) {
          // Ignore parse errors and keep user signed in by default route below.
        }

        // Do not force logout for transient network/API startup errors.
        setInitialRoute('Home');
      }
    };

    checkSession();
  }, []);

  if (initialRoute === 'Loading') {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FF6B35',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
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
        options={{ 
          headerShown: false,
          title: 'Verify OTP'
        }}
      />
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="ShopDetail" 
        component={ShopDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        initialParams={{ forceComplete: initialRoute === 'Profile' }}
        options={({ navigation, route }) => ({
          title: route.params?.forceComplete ? 'Complete Registration' : 'My Profile',
          headerLeft: route.params?.forceComplete
            ? () => null
            : () => (
                <TouchableOpacity
                  onPress={() => {
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                    } else {
                      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
                    }
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                >
                  <Feather name="arrow-left" size={20} color="#fff" />
                </TouchableOpacity>
              ),
        })}
      />
      <Stack.Screen 
        name="OrderStatus" 
        component={OrderStatusScreen}
        options={({ navigation }) => ({
          title: 'Order Status',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.reset({ index: 0, routes: [{ name: "Home" }] })}
              style={{ paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Feather name="home" size={20} color="#fff" />
            </TouchableOpacity>
          )
        })}
      />
      <Stack.Screen 
        name="Orders" 
        component={OrdersScreen}
        options={{ title: 'My Orders' }}
      />
      <Stack.Screen
        name="SupportChat"
        component={SupportChatScreen}
        options={({ route }) => ({
          title: route.params?.mode === "report" ? "Report an Issue" : "Customer Support"
        })}
      />
      {/* Only Payment screen remains */}
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
