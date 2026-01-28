// apps/partner-app/src/screens/RejectedScreen.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function RejectedScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Application Rejected</Text>
      <Text style={styles.message}>
        Your partner application has been rejected.
      </Text>
      <Text style={styles.message}>
        Please contact support for more information.
      </Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate("Onboarding")}
      >
        <Text style={styles.buttonText}>Apply Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#d32f2f"
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
    color: "#666"
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 8,
    width: "80%",
    marginTop: 30
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center"
  }
});