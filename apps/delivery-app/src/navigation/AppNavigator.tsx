import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import JobsScreen from "../screens/JobsScreen";
import JobDetailsScreen from "../screens/JobDetailsScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Jobs" component={JobsScreen} />
        <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
