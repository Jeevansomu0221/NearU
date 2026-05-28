import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

interface PartnerData {
  _id: string;
  ownerName: string;
  restaurantName: string;
  phone: string;
  category: string;
  status: string;
  hasCompletedSetup?: boolean;
  menuItemsCount?: number;
  createdAt?: string;
  documents?: {
    submittedAt?: string;
  };
}

export default function PendingApprovalScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatCategory = (category?: string) => {
    if (!category) return "Not available";
    return category
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const formatSubmittedDate = (data?: PartnerData | null) => {
    const rawDate = data?.documents?.submittedAt || data?.createdAt;
    if (!rawDate) return "Not available";
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return "Not available";
    return parsed.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const checkStatus = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const token = await AsyncStorage.getItem("token");
      const phone = await AsyncStorage.getItem("phone");

      if (!token || !phone) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }]
        });
        return;
      }

      const res = await api.get("/partners/my-status");
      const data = res.data as { success: boolean; data: PartnerData };

      if (data.success && data.data) {
        setPartnerData(data.data);

        if (data.data.status === "APPROVED") {
          navigation.reset({
            index: 0,
            routes: [{ name: "Dashboard" }]
          });
        } else if (data.data.status === "REJECTED") {
          navigation.reset({
            index: 0,
            routes: [{ name: "Rejected" }]
          });
        }
      }
    } catch (error) {
      console.error("Status check failed", error);
    } finally {
      if (isManual) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Checking review status...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.mainCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Pending Review</Text>
        </View>

        <Text style={styles.heroTitle}>Application in Review</Text>
        <Text style={styles.heroSubtitle}>We check your details and documents. Auto refresh runs every 30s.</Text>

        {partnerData ? (
          <View style={styles.detailsCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Owner</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{partnerData.ownerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Shop</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{partnerData.restaurantName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{formatCategory(partnerData.category)}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Submitted</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{formatSubmittedDate(partnerData)}</Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={styles.primaryButton} onPress={() => checkStatus(true)} disabled={refreshing}>
          {refreshing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Refresh Status</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.secondaryButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FF",
    paddingHorizontal: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F8FF",
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#5E7897",
    textAlign: "center"
  },
  mainCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    padding: 18
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF3FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#60A5FA",
    textTransform: "uppercase"
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#143A66"
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#5E7897"
  },
  detailsCard: {
    marginTop: 14,
    marginBottom: 16,
    backgroundColor: "#F9FCFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    paddingHorizontal: 12
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EEF9"
  },
  infoRowLast: {
    borderBottomWidth: 0
  },
  infoLabel: {
    fontSize: 12,
    color: "#5E7897",
    marginRight: 12
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "700",
    color: "#143A66"
  },
  primaryButton: {
    backgroundColor: "#60A5FA",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 8
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  secondaryButton: {
    backgroundColor: "#EAF3FF",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 13
  },
  secondaryButtonText: {
    color: "#60A5FA",
    fontSize: 13,
    fontWeight: "800"
  }
});
