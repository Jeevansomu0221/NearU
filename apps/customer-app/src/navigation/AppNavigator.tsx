import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import HomeScreen from '../screens/HomeScreen';
// import ShopDetailScreen from '../screens/ShopDetailScreen'; // Comment out for now
// import CartScreen from '../screens/CartScreen'; // Comment out for now
// import OrderStatusScreen from '../screens/OrderStatusScreen'; // Comment out for now

// Define stack param list
export type RootStackParamList = {
  Login: undefined;
  Otp: { phone: string };
  Home: undefined;
  ShopDetail: { shopId: string };
  Cart: undefined;
  OrderStatus: { orderId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        {/* Comment out missing screens for now */}
        {/* <Stack.Screen name="ShopDetail" component={ShopDetailScreen} /> */}
        {/* <Stack.Screen name="Cart" component={CartScreen} /> */}
        {/* <Stack.Screen name="OrderStatus" component={OrderStatusScreen} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}