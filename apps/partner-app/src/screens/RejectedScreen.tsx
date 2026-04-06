import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api/client";

export default function RejectedScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const loadReason = async () => {
      try {
        const res = await api.get("/partners/my-status");
        const data = res.data as { success: boolean; data?: { rejectionReason?: string } };
        if (data.success && data.data?.rejectionReason) {
          setRejectionReason(data.data.rejectionReason);
        }
      } catch (error) {
        console.error("Failed to load rejection reason:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReason();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Application update</Text>
        <Text style={styles.heroTitle}>Your partner application was not approved</Text>
        <Text style={styles.heroSubtitle}>
          You can review the admin feedback, update the details, and submit the application again.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Admin note</Text>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading review note...</Text>
          </View>
        ) : (
          <Text style={styles.cardText}>
            {rejectionReason || "No detailed note was added. Please review your shop details and documents before applying again."}
          </Text>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Onboarding")}>
          <Text style={styles.primaryButtonText}>Apply Again</Text>
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
    backgroundColor: "#B42318",
    borderRadius: 28,
    padding: 22
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#F8D5D2",
    marginBottom: 10
  },
  heroTitle: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#FDECEC"
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 18
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 8
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B5E55",
    marginBottom: 18
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 13,
    color: "#6B5E55"
  },
  primaryButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 15
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  }
});
