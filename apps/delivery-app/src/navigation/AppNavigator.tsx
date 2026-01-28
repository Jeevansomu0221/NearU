import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import JobsScreen from "../screens/JobsScreen";
import JobDetailsScreen from "../screens/JobDetailsScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Jobs"
        component={JobsScreen}
        options={{ title: "My Jobs" }}
      />
      <Stack.Screen
        name="JobDetails"
        component={JobDetailsScreen}
        options={{ title: "Job Details" }}
      />
    </Stack.Navigator>
  );
}
