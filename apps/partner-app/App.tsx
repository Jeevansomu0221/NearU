import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { StatusBar, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import CustomAlert from "./src/components/CustomAlert";
import PartnerOrderWatcher from "./src/components/PartnerOrderWatcher";
import AppNavigator from "./src/navigation/AppNavigator";

const navigationRef = createNavigationContainerRef();

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top"]}>
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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
