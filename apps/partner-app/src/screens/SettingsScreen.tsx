// apps/partner-app/src/screens/SettingsScreen.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.comingSoon}>Coming soon...</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20
  },
  comingSoon: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 50
  }
});