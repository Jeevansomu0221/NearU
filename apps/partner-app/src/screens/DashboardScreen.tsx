import React, { useEffect, useRef, useState } from "react";
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
import NotificationButton from "../components/NotificationButton";
import NewOrderBanner from "../components/NewOrderBanner";

const isAwaitingPartnerAction = (status: string) =>
  status === "CONFIRMED";

export default function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [shopOpen, setShopOpen] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<any>(null);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const [stats, setStats] = useState({
    todayOrders: 0,
    totalOrders: 0,
    pendingOrders: 0,
    todayEarnings: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    loadDashboardData();
    loadPendingOrders();
    const interval = setInterval(loadPendingOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingOrders = async () => {
    try {
      const res = await api.get("/orders/partner/my");
      const response = res.data as { success: boolean; data?: any[] };
      if (!response.success || !Array.isArray(response.data)) return;

      const actionable = response.data.filter((order) => isAwaitingPartnerAction(order.status));
      const newlyActionable = actionable.filter((order) => !knownOrderIds.current.has(order._id));
      knownOrderIds.current = new Set(response.data.map((order) => order._id));
      setStats((current) => ({ ...current, pendingOrders: actionable.length }));

      if (newlyActionable.length > 0) {
        setNewOrderAlert(newlyActionable[0]);
      }
    } catch (error) {
      console.log("Failed to poll partner orders", error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: "ACCEPTED" | "REJECTED") => {
    try {
      const res = await api.post(`/orders/partner/${orderId}/status`, { status });
      const response = res.data as { success: boolean; message?: string };
      if (!response.success) {
        Alert.alert("Order update failed", response.message || "Please try again.");
        return;
      }

      setNewOrderAlert(null);
      await loadPendingOrders();
      if (status === "ACCEPTED") {
        navigation.navigate("OrderDetails", { orderId });
      }
    } catch (error: any) {
      Alert.alert("Order update failed", error.response?.data?.message || "Please try again.");
    }
  };

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
        <ActivityIndicator size="large" color="#2F80ED" />
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
    { title: "Menu", target: "Menu" },
    { title: "Orders", target: "Orders" },
    { title: "Profile", target: "Profile" },
    { title: "Settings", target: "Settings" }
  ];

  return (
    <View style={styles.container}>
      <NewOrderBanner
        visible={Boolean(newOrderAlert)}
        orderId={newOrderAlert?._id || ""}
        itemCount={newOrderAlert?.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0}
        grandTotal={newOrderAlert?.grandTotal || 0}
        onOpen={() => newOrderAlert && navigation.navigate("OrderDetails", { orderId: newOrderAlert._id })}
        onAccept={() => newOrderAlert && updateOrderStatus(newOrderAlert._id, "ACCEPTED")}
        onReject={() => newOrderAlert && updateOrderStatus(newOrderAlert._id, "REJECTED")}
        onDismiss={() => setNewOrderAlert(null)}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Dashboard</Text>
          <Text style={styles.screenSubtitle}>Today at a glance</Text>
        </View>
        <NotificationButton count={stats.pendingOrders} onPress={() => navigation.navigate("Orders")} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Partner dashboard</Text>
        <Text style={styles.heroTitle}>{partner.restaurantName || partner.shopName || "Your Shop"}</Text>

        <View style={styles.statusCard}>
          <View style={styles.statusCopy}>
            <Text style={styles.statusLabel}>Store visibility</Text>
            <Text style={styles.statusValue}>{shopOpen ? "Open for orders" : "Temporarily closed"}</Text>
          </View>
          <Switch
            value={shopOpen}
            onValueChange={toggleShopStatus}
            trackColor={{ false: "#D3E3F7", true: "#9FC5F8" }}
            thumbColor={shopOpen ? "#2F80ED" : "#9AB3CC"}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FF"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F8FF"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B5E55"
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#2F80ED",
    borderRadius: 30,
    padding: 16
  },
  topBar: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#143A66"
  },
  screenSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#5E7897"
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
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  statusCard: {
    marginTop: 12,
    backgroundColor: "#FFF6F1",
    borderRadius: 18,
    padding: 12,
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
    color: "#143A66"
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
    fontSize: 15,
    fontWeight: "800",
    color: "#143A66",
    marginBottom: 10
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2F80ED"
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
    borderColor: "#D9E6F7",
    padding: 10,
    marginBottom: 8
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2F80ED",
    marginBottom: 4
  },
  statLabel: {
    fontSize: 10,
    lineHeight: 16,
    color: "#5E7897"
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    padding: 12,
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
    color: "#143A66",
    marginBottom: 0
  },
  actionArrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2F80ED"
  },
  snapshotCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D9E6F7",
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
    color: "#5E7897"
  },
  snapshotValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#143A66"
  }
});
