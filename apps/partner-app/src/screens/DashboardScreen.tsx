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
import NotificationButton from "../components/NotificationButton";
import { Ionicons } from "@expo/vector-icons";


const isAwaitingPartnerAction = (status: string) =>
  status === "CONFIRMED";

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
      setStats((current) => ({ ...current, pendingOrders: actionable.length }));
    } catch (error) {
      console.log("Failed to poll partner orders", error);
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
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Unable to load partner details.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.shopNameText} numberOfLines={1}>
              {partner.restaurantName || partner.shopName || "Your Shop"}
            </Text>
          </View>
          <NotificationButton count={stats.pendingOrders} onPress={() => navigation.navigate("Orders")} />
        </View>

        <View style={[styles.statusBanner, shopOpen ? styles.statusBannerOpen : styles.statusBannerClosed]}>
          <View style={styles.statusIndicatorCircle}>
            <View style={[styles.pulseDot, shopOpen ? styles.pulseDotOpen : styles.pulseDotClosed]} />
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={[styles.statusHeading, shopOpen ? styles.statusHeadingOpen : styles.statusHeadingClosed]}>
              {shopOpen ? "Store is Open" : "Store is Offline"}
            </Text>
            <Text style={[styles.statusSubheading, shopOpen ? styles.statusSubheadingOpen : styles.statusSubheadingClosed]}>
              {shopOpen ? "Accepting customer orders" : "Tap switch to go online"}
            </Text>
          </View>
          <Switch
            value={shopOpen}
            onValueChange={toggleShopStatus}
            trackColor={{ false: "#FDA4AF", true: "#A7F3D0" }}
            thumbColor={shopOpen ? "#10B981" : "#F43F5E"}
          />
        </View>

        <View style={styles.metricsCard}>
          <View style={styles.metricsHeader}>
            <View>
              <Text style={styles.metricsLabel}>Today's Earnings</Text>
              <Text style={styles.metricsValue}>Rs {stats.todayEarnings}</Text>
            </View>
            <View style={styles.earningsIconContainer}>
              <Ionicons name="wallet-outline" size={24} color="#60A5FA" />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metricsSubGrid}>
            <View style={styles.subStatItem}>
              <Text style={styles.subStatLabel}>Pending</Text>
              <Text style={[styles.subStatValue, stats.pendingOrders > 0 ? styles.subStatPendingHighlight : null]}>
                {stats.pendingOrders}
              </Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.subStatItem}>
              <Text style={styles.subStatLabel}>Orders Today</Text>
              <Text style={styles.subStatValue}>{stats.todayOrders}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.subStatItem}>
              <Text style={styles.subStatLabel}>Active Menu</Text>
              <Text style={styles.subStatValue}>{partner.menuItemsCount || 0}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.gridContainer}>
            <TouchableOpacity style={styles.gridCard} onPress={() => navigation.navigate("Orders")} activeOpacity={0.7}>
              <View style={[styles.gridIconCircle, { backgroundColor: "#EBF3FE" }]}>
                <Ionicons name="cart" size={22} color="#60A5FA" />
              </View>
              <Text style={styles.gridCardTitle}>Orders</Text>
              <Text style={styles.gridCardDesc}>Live & past orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridCard} onPress={() => navigation.navigate("Menu")} activeOpacity={0.7}>
              <View style={[styles.gridIconCircle, { backgroundColor: "#FFF6ED" }]}>
                <Ionicons name="restaurant" size={20} color="#EA580C" />
              </View>
              <Text style={styles.gridCardTitle}>Menu</Text>
              <Text style={styles.gridCardDesc}>Items & pricing</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.gridContainer, { marginTop: 10 }]}>
            <TouchableOpacity style={styles.gridCard} onPress={() => navigation.navigate("Profile")} activeOpacity={0.7}>
              <View style={[styles.gridIconCircle, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="storefront" size={20} color="#10B981" />
              </View>
              <Text style={styles.gridCardTitle}>Profile</Text>
              <Text style={styles.gridCardDesc}>Business & details</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridCard} onPress={() => navigation.navigate("Settings")} activeOpacity={0.7}>
              <View style={[styles.gridIconCircle, { backgroundColor: "#F1F5F9" }]}>
                <Ionicons name="settings-sharp" size={20} color="#475569" />
              </View>
              <Text style={styles.gridCardTitle}>Settings</Text>
              <Text style={styles.gridCardDesc}>System & alerts</Text>
            </TouchableOpacity>
          </View>
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
              <View style={styles.snapshotRowLeft}>
                <Ionicons name="analytics-outline" size={18} color="#5E7897" style={styles.rowIcon} />
                <Text style={styles.snapshotLabel}>Total orders</Text>
              </View>
              <Text style={styles.snapshotValue}>{stats.totalOrders}</Text>
            </View>

            <View style={styles.snapshotRow}>
              <View style={styles.snapshotRowLeft}>
                <Ionicons name="cash-outline" size={18} color="#5E7897" style={styles.rowIcon} />
                <Text style={styles.snapshotLabel}>Total earnings</Text>
              </View>
              <Text style={styles.snapshotValue}>Rs {stats.totalEarnings}</Text>
            </View>

            <View style={[styles.snapshotRow, { borderBottomWidth: 0 }]}>
              <View style={styles.snapshotRowLeft}>
                <Ionicons name="checkbox-outline" size={18} color="#5E7897" style={styles.rowIcon} />
                <Text style={styles.snapshotLabel}>Approval status</Text>
              </View>
              <Text style={[styles.snapshotValue, styles.statusBadgeText]}>{partner.status || "APPROVED"}</Text>
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
  headerContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerLeft: {
    flex: 1,
    marginRight: 12
  },
  welcomeText: {
    fontSize: 13,
    color: "#5E7897",
    fontWeight: "600"
  },
  shopNameText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#143A66",
    marginTop: 2
  },
  statusBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#143A66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1
  },
  statusBannerOpen: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0"
  },
  statusBannerClosed: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECDD3"
  },
  statusIndicatorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  pulseDotOpen: {
    backgroundColor: "#10B981"
  },
  pulseDotClosed: {
    backgroundColor: "#EF4444"
  },
  statusTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10
  },
  statusHeading: {
    fontSize: 15,
    fontWeight: "800"
  },
  statusHeadingOpen: {
    color: "#065F46"
  },
  statusHeadingClosed: {
    color: "#991B1B"
  },
  statusSubheading: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: "500"
  },
  statusSubheadingOpen: {
    color: "#047857"
  },
  statusSubheadingClosed: {
    color: "#B91C1C"
  },
  metricsCard: {
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    padding: 18,
    shadowColor: "#143A66",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2
  },
  metricsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  metricsLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5E7897",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  metricsValue: {
    fontSize: 30,
    fontWeight: "900",
    color: "#143A66",
    marginTop: 4
  },
  earningsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F0F6FE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E1EEFE"
  },
  divider: {
    height: 1,
    backgroundColor: "#E6EEF9",
    marginVertical: 16
  },
  metricsSubGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  subStatItem: {
    flex: 1,
    alignItems: "center"
  },
  verticalDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E6EEF9"
  },
  subStatLabel: {
    fontSize: 11,
    color: "#5E7897",
    fontWeight: "600",
    marginBottom: 4
  },
  subStatValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#143A66"
  },
  subStatPendingHighlight: {
    color: "#EA580C"
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 18
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#143A66",
    marginBottom: 10
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#60A5FA"
  },
  gridContainer: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  gridCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    padding: 16,
    shadowColor: "#143A66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#143A66"
  },
  gridCardDesc: {
    fontSize: 11,
    color: "#5E7897",
    marginTop: 2,
    fontWeight: "500"
  },
  snapshotCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#143A66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1
  },
  snapshotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EEF9"
  },
  snapshotRowLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  rowIcon: {
    marginRight: 10
  },
  snapshotLabel: {
    fontSize: 13,
    color: "#5E7897",
    fontWeight: "600"
  },
  snapshotValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#143A66"
  },
  statusBadgeText: {
    color: "#10B981"
  }
});
