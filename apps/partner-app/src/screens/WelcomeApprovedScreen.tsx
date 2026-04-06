import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WelcomeApprovedScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Approved</Text>
        <Text style={styles.heroTitle}>Your shop has been approved</Text>
        <Text style={styles.heroSubtitle}>
          Finish your menu setup so customers can discover the shop and start placing orders.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Next steps</Text>
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.stepText}>Add your main dishes and prices</Text>
        </View>
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>2</Text>
          <Text style={styles.stepText}>Upload clean item photos</Text>
        </View>
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>3</Text>
          <Text style={styles.stepText}>Check shop timings and availability</Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Menu")}>
          <Text style={styles.primaryButtonText}>Set Up Menu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Dashboard")}>
          <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3EE"
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#216E39",
    borderRadius: 28,
    padding: 22
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#DDF8E5",
    marginBottom: 10
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#EDF9F0"
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 18
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 14
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FDE9DE",
    color: "#C4541C",
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "800",
    marginRight: 10
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B5E55"
  },
  primaryButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 15,
    marginTop: 8,
    marginBottom: 10
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  secondaryButton: {
    backgroundColor: "#FDE9DE",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 15
  },
  secondaryButtonText: {
    color: "#C4541C",
    fontSize: 14,
    fontWeight: "800"
  }
});
