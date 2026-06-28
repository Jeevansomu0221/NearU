import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";
import { partnerTheme } from "../theme";

interface PartnerSuspensionInfo {
  rejectionReason?: string;
  suspensionType?: "TEMPORARY" | "PERMANENT" | null;
  suspendedUntil?: string | null;
  restaurantName?: string;
}

export default function SuspendedScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<PartnerSuspensionInfo | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await api.get("/partners/my-status");
        const data = res.data as { success: boolean; data?: PartnerSuspensionInfo };
        if (data.success && data.data) {
          setInfo(data.data);
        }
      } catch (error) {
        console.error("Failed to load suspension details:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(["token", "refreshToken", "user"]);
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const suspensionLabel =
    info?.suspensionType === "TEMPORARY"
      ? `Temporarily suspended until ${info.suspendedUntil ? new Date(info.suspendedUntil).toLocaleString() : "the end date"}`
      : "Permanently suspended";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Account suspended</Text>
        <Text style={styles.heroTitle}>{info?.restaurantName || "Your shop"} is not active</Text>
        <Text style={styles.heroSubtitle}>
          Customers cannot see or order from your shop while it is suspended.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{suspensionLabel}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={partnerTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading admin message...</Text>
          </View>
        ) : (
          <Text style={styles.cardText}>
            {info?.rejectionReason ||
              "No detailed note was added. Please contact the admin team if you need help."}
          </Text>
        )}

        <TouchableOpacity style={styles.linkButton} onPress={handleLogout}>
          <Text style={styles.linkButtonText}>Logout</Text>
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
    backgroundColor: "#B42318",
    borderRadius: 28,
    padding: 22
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#FEE4E2",
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
    color: "#FEE4E2"
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
  secondaryButton: {
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border
  },
  secondaryButtonText: {
    color: partnerTheme.colors.primary,
    fontSize: 14,
    fontWeight: "800"
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center"
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: partnerTheme.colors.muted
  }
});
