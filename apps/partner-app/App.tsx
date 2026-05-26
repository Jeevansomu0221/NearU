import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import CustomAlert from "./src/components/CustomAlert";
import PartnerOrderWatcher from "./src/components/PartnerOrderWatcher";
import AppNavigator from "./src/navigation/AppNavigator";

const navigationRef = createNavigationContainerRef();

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#F4F8FF"
          translucent={false}
        />
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
        <CustomAlert />
        <PartnerOrderWatcher navigationRef={navigationRef} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
