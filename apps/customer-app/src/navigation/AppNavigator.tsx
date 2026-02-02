import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import HomeScreen from '../screens/HomeScreen';
import ShopDetailScreen from '../screens/ShopDetailScreen';
import CartScreen from '../screens/CartScreen';

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
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ShopDetail" component={ShopDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
    </Stack.Navigator>
  );
}