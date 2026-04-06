// apps/customer-app/src/navigation/AppNavigator.tsx
import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import HomeScreen from '../screens/HomeScreen';
import ShopDetailScreen from '../screens/ShopDetailScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from "../screens/ProfileScreen";
import OrderStatusScreen from "../screens/OrderStatusScreen";
import OrdersScreen from "../screens/OrdersScreen";
import PaymentScreen from '../screens/PaymentScreen'; // Keep PaymentScreen
import { getUserProfile } from '../api/user.api';

// Define Address interface
export interface Address {
  state?: string;
  city?: string;
  pincode?: string;
  area?: string;
  colony?: string;
  roadStreet?: string;
  nearbyPlaces?: string[];
  googleMapsLink?: string;
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
  total: number;
  address: string;
  note?: string;
  groupedShops?: Array<{
    shopId: string;
    shopName: string;
    items: any[];
    subtotal: number;
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
  };
  Cart: {
    shop?: Shop;
  } | undefined;
  Profile: { forceComplete?: boolean } | undefined;
  OrderStatus: {
    orderId: string;
  };
  Orders: undefined;
  Payment: { // Only Payment screen remains
    userProfile: UserProfile;
    orderSummary: OrderSummary;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

const isCustomerProfileComplete = (profile: {
  name?: string;
  address?: Address & { street?: string; landmark?: string };
}) => {
  const hasRealName =
    !!profile.name &&
    !/^Customer\s\d{4}$/.test(profile.name.trim()) &&
    profile.name.trim().length >= 3;

  const address = profile.address;
  const hasAddress =
    !!address?.street &&
    !!address?.city &&
    !!address?.state &&
    !!address?.pincode &&
    !!address?.area;

  return Boolean(hasRealName && hasAddress);
};

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | 'Loading'>('Loading');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem('token');

        if (!token) {
          setInitialRoute('Login');
          return;
        }

        const response = await getUserProfile();
        if (response.success && response.data) {
          setInitialRoute(isCustomerProfileComplete(response.data) ? 'Home' : 'Profile');
          return;
        }

        await AsyncStorage.multiRemove(['token', 'user']);
        setInitialRoute('Login');
      } catch (error) {
        await AsyncStorage.multiRemove(['token', 'user']);
        setInitialRoute('Login');
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
        options={{ title: 'Restaurant Details' }}
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
        options={({ route }) => ({
          title: route.params?.forceComplete ? 'Complete Registration' : 'My Profile',
          headerLeft: route.params?.forceComplete ? () => null : undefined,
        })}
      />
      <Stack.Screen 
        name="OrderStatus" 
        component={OrderStatusScreen}
        options={{ title: 'Order Status' }}
      />
      <Stack.Screen 
        name="Orders" 
        component={OrdersScreen}
        options={{ title: 'My Orders' }}
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
