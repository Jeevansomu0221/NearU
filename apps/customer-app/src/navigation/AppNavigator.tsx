import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import OtpScreen from "../screens/OtpScreen";
import HomeScreen from "../screens/HomeScreen";
import CreateOrderScreen from "../screens/CreateOrderScreen";
import OrderStatusScreen from "../screens/OrderStatusScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
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
  name="Home"
  component={HomeScreen}
  options={{ title: "NearU" }}
/>

<Stack.Screen
  name="CreateOrder"
  component={CreateOrderScreen}
  options={{ title: "Create Order" }}
/>
<Stack.Screen
  name="OrderStatus"
  component={OrderStatusScreen}
  options={{ title: "Order Status" }}
/>


    </Stack.Navigator>
  );
}
