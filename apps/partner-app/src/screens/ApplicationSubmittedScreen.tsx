import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ApplicationSubmittedScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const ownerName = route?.params?.ownerName || "Partner";
  const restaurantName = route?.params?.restaurantName || "your shop";

  return (
    <View style={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Submitted</Text>
        </View>

        <Text style={styles.title}>Application Sent</Text>
        <Text style={styles.subtitle}>
          Nice work {ownerName}. {restaurantName} is now in review.
        </Text>

        <View style={styles.pointsCard}>
          <Text style={styles.point}>- We verify your business details and documents.</Text>
          <Text style={styles.point}>- You can update profile details after approval.</Text>
          <Text style={styles.point}>- Status refresh happens every 30 seconds.</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] })}
        >
          <Text style={styles.primaryButtonText}>Go To Review Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FF",
    paddingHorizontal: 16,
    justifyContent: "center"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    padding: 20
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF3FF",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginBottom: 10
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2F80ED",
    textTransform: "uppercase"
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#143A66"
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#5E7897"
  },
  pointsCard: {
    marginTop: 14,
    marginBottom: 18,
    backgroundColor: "#F9FCFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 16,
    padding: 12
  },
  point: {
    fontSize: 13,
    lineHeight: 20,
    color: "#355877",
    marginBottom: 4
  },
  primaryButton: {
    backgroundColor: "#2F80ED",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 15
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  }
});
