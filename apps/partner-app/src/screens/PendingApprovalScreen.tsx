import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from "react-native";
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
  createdAt: string;
}

export default function PendingApprovalScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    try {
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
          if (!data.data.hasCompletedSetup && (!data.data.menuItemsCount || data.data.menuItemsCount === 0)) {
            navigation.reset({
              index: 0,
              routes: [{ name: "WelcomeApproved" }]
            });
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: "Dashboard" }]
            });
          }
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
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Checking your application status...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Application review</Text>
        <Text style={styles.heroTitle}>Your shop application is under review</Text>
        <Text style={styles.heroSubtitle}>
          We are checking your business details before approval. This screen refreshes automatically every 30 seconds.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Pending</Text>
        </View>
        <Text style={styles.cardTitle}>What happens next</Text>
        <Text style={styles.cardText}>
          The admin team will verify your shop details and approve the account. Once approved, you will be taken straight into setup.
        </Text>
      </View>

      {partnerData ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Application details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Owner</Text>
            <Text style={styles.infoValue}>{partnerData.ownerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shop</Text>
            <Text style={styles.infoValue}>{partnerData.restaurantName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category</Text>
            <Text style={styles.infoValue}>{partnerData.category}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Submitted</Text>
            <Text style={styles.infoValue}>
              {new Date(partnerData.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
              })}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={checkStatus}>
          <Text style={styles.primaryButtonText}>Refresh Status</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.secondaryButtonText}>Back to Login</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F3EE",
    padding: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#6B5E55",
    textAlign: "center"
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FF6B35",
    borderRadius: 28,
    padding: 22
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#FFE4D7",
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
    color: "#FFF4EE"
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 16
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF2D9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#A15C00"
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
    color: "#6B5E55"
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 10
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F2E9E0"
  },
  infoLabel: {
    fontSize: 13,
    color: "#7B6D63",
    marginRight: 12
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#2C2018"
  },
  actions: {
    paddingHorizontal: 16
  },
  primaryButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 15,
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
