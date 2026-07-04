import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api/client";
import { partnerTheme } from "../theme";
import { subscribeReviewStatusRefresh } from "../services/reviewStatusRefresh";

export default function RejectedScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadReason = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/partners/my-status");
      const data = res.data as { success: boolean; data?: { rejectionReason?: string; status?: string } };
      if (data.success && data.data?.rejectionReason) {
        setRejectionReason(data.data.rejectionReason);
      }
      if (data.success && data.data?.status === "APPROVED") {
        navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
      } else if (data.success && data.data?.status === "PENDING") {
        navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
      }
    } catch (error) {
      console.error("Failed to load rejection reason:", error);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    void loadReason();
  }, [loadReason]);

  useEffect(() => {
    return subscribeReviewStatusRefresh(() => {
      void loadReason();
    });
  }, [loadReason]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
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
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Admin note</Text>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={partnerTheme.colors.primary} />
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
    backgroundColor: partnerTheme.colors.background
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 28,
    padding: 22
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#DDEBFF",
    marginBottom: 10
  },
  heroTitle: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
    color: partnerTheme.colors.card
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#EAF3FF"
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: partnerTheme.colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 18
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: partnerTheme.colors.dangerSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: partnerTheme.colors.danger,
    textTransform: "uppercase"
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: partnerTheme.colors.muted,
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
    color: partnerTheme.colors.muted
  },
  primaryButton: {
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 15
  },
  primaryButtonText: {
    color: partnerTheme.colors.card,
    fontSize: 14,
    fontWeight: "800"
  }
});
