import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import HomeScreen from '../screens/HomeScreen';
import ShopDetailScreen from '../screens/ShopDetailScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from "../screens/ProfileScreen";
import OrderStatusScreen from "../screens/OrderStatusScreen";
import OrdersScreen from "../screens/OrdersScreen";

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
  closingTime?: string;
  openingTime?: string;
  phone?: string;
}

// Define stack param list
export type RootStackParamList = {
  Login: undefined;
  Otp: { phone: string };
  Home: undefined;
  ShopDetail: { 
    shopId: string;
    shop?: Shop; // Add optional shop parameter
  };
  Cart: {
    shop: Shop;
  };
  Profile: undefined; // Add this line - Profile doesn't need params
  OrderStatus: {
    orderId: string;
  };
  Orders: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
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
          title: 'NearU Food',
          headerRight: undefined // Will be set in HomeScreen
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
        options={{ title: 'Your Cart' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
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
    </Stack.Navigator>
  );
}