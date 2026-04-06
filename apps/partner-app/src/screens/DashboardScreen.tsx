import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

export default function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [shopOpen, setShopOpen] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayOrders: 0,
    totalOrders: 0,
    pendingOrders: 0,
    todayEarnings: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const phone = await AsyncStorage.getItem("phone");
      const res = await api.get(`/partners/status/${phone}`);
      const partnerData = res.data as { success: boolean; data: any };
      setPartner(partnerData.data);
      setShopOpen(partnerData.data?.isOpen !== false);

      try {
        const statsRes = await api.get("/partners/stats");
        const statsData = statsRes.data as { success: boolean; data: any };
        setStats(
          statsData.data || {
            todayOrders: 0,
            totalOrders: 0,
            pendingOrders: 0,
            todayEarnings: 0,
            totalEarnings: 0
          }
        );
      } catch (statsError) {
        console.log("Stats endpoint not available yet, using defaults");
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleShopStatus = async () => {
    try {
      await api.put("/partners/shop-status", { isOpen: !shopOpen });
      setShopOpen(!shopOpen);
      Alert.alert("Shop Status Updated", `Your shop is now ${!shopOpen ? "OPEN" : "CLOSED"}`);
    } catch (error) {
      Alert.alert("Error", "Failed to update shop status");
    }
  };

  if (loading && !partner) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Unable to load partner details.</Text>
      </View>
    );
  }

  const quickStats = [
    { label: "Today's Orders", value: stats.todayOrders },
    { label: "Today's Earnings", value: `Rs ${stats.todayEarnings}` },
    { label: "Pending Orders", value: stats.pendingOrders },
    { label: "Menu Items", value: partner.menuItemsCount || 0 }
  ];

  const quickActions = [
    { title: "Manage Menu", description: "Add, edit, and organize your dishes", target: "Menu" },
    { title: "View Orders", description: `${stats.pendingOrders} pending orders waiting right now`, target: "Orders" },
    { title: "Shop Profile", description: "Update timings, shop image, and address", target: "Profile" },
    { title: "Business Settings", description: "Adjust business preferences and hours", target: "Settings" }
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Partner dashboard</Text>
        <Text style={styles.heroTitle}>{partner.restaurantName || partner.shopName || "Your Shop"}</Text>
        <Text style={styles.heroSubtitle}>
          Track live performance, manage availability, and stay on top of incoming orders.
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusCopy}>
            <Text style={styles.statusLabel}>Store visibility</Text>
            <Text style={styles.statusValue}>{shopOpen ? "Open for orders" : "Temporarily closed"}</Text>
            <Text style={styles.statusHint}>
              {shopOpen ? "Customers can discover and order from your store." : "Customers will not be able to place new orders."}
            </Text>
          </View>
          <Switch
            value={shopOpen}
            onValueChange={toggleShopStatus}
            trackColor={{ false: "#E8DDD2", true: "#FFB08F" }}
            thumbColor={shopOpen ? "#FF6B35" : "#BCA99B"}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's overview</Text>
        <View style={styles.statsGrid}>
          {quickStats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        {quickActions.map((action) => (
          <TouchableOpacity key={action.title} style={styles.actionCard} onPress={() => navigation.navigate(action.target)}>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
            </View>
            <Text style={styles.actionArrow}>Open</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Business snapshot</Text>
          <TouchableOpacity onPress={loadDashboardData}>
            <Text style={styles.linkText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.snapshotCard}>
          <View style={styles.snapshotRow}>
            <Text style={styles.snapshotLabel}>Total orders</Text>
            <Text style={styles.snapshotValue}>{stats.totalOrders}</Text>
          </View>
          <View style={styles.snapshotRow}>
            <Text style={styles.snapshotLabel}>Total earnings</Text>
            <Text style={styles.snapshotValue}>Rs {stats.totalEarnings}</Text>
          </View>
          <View style={styles.snapshotRow}>
            <Text style={styles.snapshotLabel}>Approval status</Text>
            <Text style={styles.snapshotValue}>{partner.status || "Approved"}</Text>
          </View>
        </View>
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
    backgroundColor: "#F7F3EE"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B5E55"
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#FF6B35",
    borderRadius: 30,
    padding: 18
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
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#FFF4EE"
  },
  statusCard: {
    marginTop: 14,
    backgroundColor: "#FFF6F1",
    borderRadius: 18,
    padding: 13,
    flexDirection: "row",
    alignItems: "center"
  },
  statusCopy: {
    flex: 1,
    marginRight: 14
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8B6A54",
    marginBottom: 4
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018"
  },
  statusHint: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: "#6B5E55"
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 14
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 10
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#C4541C"
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 13,
    marginBottom: 8
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FF6B35",
    marginBottom: 4
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 16,
    color: "#7B6D63"
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 13,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center"
  },
  actionCopy: {
    flex: 1,
    marginRight: 12
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 3
  },
  actionDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: "#6B5E55"
  },
  actionArrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#C4541C"
  },
  snapshotCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 13
  },
  snapshotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F2E9E0"
  },
  snapshotLabel: {
    fontSize: 12,
    color: "#7B6D63"
  },
  snapshotValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C2018"
  }
});
