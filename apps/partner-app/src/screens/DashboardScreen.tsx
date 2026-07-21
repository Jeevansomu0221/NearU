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
import { getPartnerWallet, type PartnerWallet } from "../api/partner.api";
import { usePartnerTheme } from "../context/PartnerThemeContext";
import { Ionicons } from "@expo/vector-icons";


const isAwaitingPartnerAction = (status: string) =>
  status === "CONFIRMED";

export default function DashboardScreen({ navigation }: any) {
  const { isDarkMode, theme } = usePartnerTheme();
  const insets = useSafeAreaInsets();
  const [shopOpen, setShopOpen] = useState(true);
  const [togglingShop, setTogglingShop] = useState(false);
  const togglingShopRef = useRef(false);
  const [partner, setPartner] = useState<any>(null);
  const [wallet, setWallet] = useState<PartnerWallet | null>(null);
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

  useEffect(() => {
    const unsubscribe = navigation.addListener?.("focus", () => {
      loadDashboardData({ silent: true });
    });
    return unsubscribe;
  }, [navigation]);

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

  const loadDashboardData = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      const res = await api.get("/partners/my-status");
      const partnerData = res.data as { success: boolean; data: any };
      if (!partnerData.success || !partnerData.data) {
        throw new Error("Partner profile not found");
      }
      setPartner(partnerData.data);
      // Don't clobber an in-flight optimistic toggle with a stale refresh.
      if (!togglingShopRef.current) {
        setShopOpen(partnerData.data?.isOpen !== false);
      }

      try {
        const [statsRes, walletRes] = await Promise.all([
          api.get("/partners/stats"),
          getPartnerWallet()
        ]);
        const statsData = statsRes.data as { success: boolean; data: any };
        const walletData = walletRes.data;
        if (walletData.success && walletData.data) {
          setWallet(walletData.data);
        }
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
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  const toggleShopStatus = async (nextOpen: boolean) => {
    if (togglingShopRef.current || nextOpen === shopOpen) return;

    const previous = shopOpen;
    togglingShopRef.current = true;
    setTogglingShop(true);
    setShopOpen(nextOpen);

    try {
      await api.put("/partners/shop-status", { isOpen: nextOpen });
    } catch (error) {
      setShopOpen(previous);
      Alert.alert("Error", "Failed to update shop status. Please try again.");
    } finally {
      togglingShopRef.current = false;
      setTogglingShop(false);
    }
  };

  const formatMoney = (amount: number) => `Rs ${Math.round(Number(amount || 0)).toLocaleString("en-IN")}`;

  const openWallet = () => {
    navigation.navigate("PaymentHistory", wallet ? { wallet } : undefined);
  };

  if (loading && !partner) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.containerDark, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, isDarkMode && styles.mutedTextDark]}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.containerDark, { paddingTop: insets.top }]}>
        <Text style={[styles.loadingText, isDarkMode && styles.mutedTextDark]}>Unable to load partner details.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark, { paddingTop: insets.top }]}>
      <ScrollView
        style={[styles.container, isDarkMode && styles.containerDark]}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={[styles.welcomeText, isDarkMode && styles.mutedTextDark]}>Welcome back,</Text>
            <Text style={[styles.shopNameText, isDarkMode && styles.textDark]} numberOfLines={1}>
              {partner.restaurantName || partner.shopName || "Your Shop"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.settingsButton, isDarkMode && styles.cardDark]}
              onPress={() => navigation.navigate("Settings")}
              activeOpacity={0.75}
            >
              <Ionicons name="settings-outline" size={22} color={theme.colors.primaryDark} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          disabled={togglingShop}
          onPress={() => toggleShopStatus(!shopOpen)}
          style={[
            styles.statusBanner,
            shopOpen ? styles.statusBannerOpen : styles.statusBannerClosed,
            isDarkMode && (shopOpen ? styles.statusBannerOpenDark : styles.statusBannerClosedDark)
          ]}
        >
          <View style={[styles.statusIndicatorCircle, isDarkMode && styles.statusIndicatorCircleDark]}>
            <View style={[styles.pulseDot, shopOpen ? styles.pulseDotOpen : styles.pulseDotClosed]} />
          </View>
          <View style={styles.statusTextContainer}>
            <Text
              style={[
                styles.statusHeading,
                shopOpen ? styles.statusHeadingOpen : styles.statusHeadingClosed,
                isDarkMode && (shopOpen ? styles.statusHeadingOpenDark : styles.statusHeadingClosedDark)
              ]}
            >
              {shopOpen ? "Store is Open" : "Store is Offline"}
            </Text>
            <Text
              style={[
                styles.statusSubheading,
                shopOpen ? styles.statusSubheadingOpen : styles.statusSubheadingClosed,
                isDarkMode && (shopOpen ? styles.statusSubheadingOpenDark : styles.statusSubheadingClosedDark)
              ]}
            >
              {togglingShop
                ? "Updating..."
                : shopOpen
                  ? "Accepting customer orders"
                  : "Tap to go online"}
            </Text>
          </View>
          <Switch
            value={shopOpen}
            onValueChange={toggleShopStatus}
            disabled={togglingShop}
            trackColor={{ false: "#FDA4AF", true: "#A7F3D0" }}
            thumbColor={shopOpen ? "#10B981" : "#F43F5E"}
            // Banner handles taps; keep Switch visual only to avoid ScrollView eating the first press.
            pointerEvents="none"
          />
        </TouchableOpacity>

        <View style={[styles.metricsCard, isDarkMode && styles.cardDark]}>
          <View style={styles.metricsHeader}>
            <View style={styles.metricAmountBlock}>
              <Text style={[styles.metricsLabel, isDarkMode && styles.mutedTextDark]}>Today's Earnings</Text>
              <Text style={[styles.metricsValue, isDarkMode && styles.metricValueDark]}>{formatMoney(wallet?.todayEarnings ?? stats.todayEarnings)}</Text>
            </View>
            <TouchableOpacity style={[styles.walletSummaryButton, isDarkMode && styles.walletSummaryButtonDark]} onPress={openWallet} activeOpacity={0.75}>
              <View style={[styles.earningsIconContainer, isDarkMode && styles.earningsIconContainerDark]}>
                <Ionicons name="wallet-outline" size={22} color="#60A5FA" />
              </View>
              <View style={styles.walletSummaryCopy}>
                <Text style={[styles.walletSummaryLabel, isDarkMode && styles.mutedTextDark]}>Wallet</Text>
                <Text style={[styles.walletSummaryValue, isDarkMode && styles.textDark]}>{formatMoney(wallet?.walletBalance || 0)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={isDarkMode ? "#9FB0C5" : "#8AA4C2"} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

          <View style={styles.metricsSubGrid}>
            <View style={styles.subStatItem}>
              <Text style={[styles.subStatLabel, isDarkMode && styles.mutedTextDark]}>To Payout</Text>
              <Text style={[styles.subStatValue, isDarkMode && styles.textDark]}>
                {wallet?.pendingPayoutOrderCount ?? 0}
              </Text>
            </View>
            <View style={[styles.verticalDivider, isDarkMode && styles.dividerDark]} />
            <View style={styles.subStatItem}>
              <Text style={[styles.subStatLabel, isDarkMode && styles.mutedTextDark]}>Orders Today</Text>
              <Text style={[styles.subStatValue, isDarkMode && styles.textDark]}>{stats.todayOrders}</Text>
            </View>
            <View style={[styles.verticalDivider, isDarkMode && styles.dividerDark]} />
            <View style={styles.subStatItem}>
              <Text style={[styles.subStatLabel, isDarkMode && styles.mutedTextDark]}>Pending Orders</Text>
              <Text style={[styles.subStatValue, isDarkMode && styles.textDark, stats.pendingOrders > 0 ? styles.subStatPendingHighlight : null]}>
                {stats.pendingOrders}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Quick actions</Text>
          <View style={styles.gridContainer}>
            <TouchableOpacity style={[styles.gridCard, isDarkMode && styles.cardDark]} onPress={() => navigation.navigate("Orders")} activeOpacity={0.7}>
              <View style={[styles.gridIconCircle, { backgroundColor: "#EBF3FE" }]}>
                <Ionicons name="cart" size={22} color="#60A5FA" />
              </View>
              <Text style={[styles.gridCardTitle, isDarkMode && styles.textDark]}>Orders</Text>
              <Text style={[styles.gridCardDesc, isDarkMode && styles.mutedTextDark]}>Live & past orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.gridCard, isDarkMode && styles.cardDark]} onPress={() => navigation.navigate("Menu")} activeOpacity={0.7}>
              <View style={[styles.gridIconCircle, { backgroundColor: "#FFF6ED" }]}>
                <Ionicons name="restaurant" size={20} color="#EA580C" />
              </View>
              <Text style={[styles.gridCardTitle, isDarkMode && styles.textDark]}>Menu</Text>
              <Text style={[styles.gridCardDesc, isDarkMode && styles.mutedTextDark]}>Items & pricing</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.gridContainer, { marginTop: 10 }]}>
            <TouchableOpacity style={[styles.gridCard, isDarkMode && styles.cardDark]} onPress={() => navigation.navigate("Profile")} activeOpacity={0.7}>
              <View style={[styles.gridIconCircle, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="storefront" size={20} color="#10B981" />
              </View>
              <Text style={[styles.gridCardTitle, isDarkMode && styles.textDark]}>Profile</Text>
              <Text style={[styles.gridCardDesc, isDarkMode && styles.mutedTextDark]}>Business & details</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.gridCard, isDarkMode && styles.cardDark]} onPress={() => navigation.navigate("Reviews")} activeOpacity={0.7}>
              <View style={[styles.gridIconCircle, { backgroundColor: "#FFF7ED" }]}>
                <Ionicons name="star" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.gridCardTitle, isDarkMode && styles.textDark]}>Reviews</Text>
              <Text style={[styles.gridCardDesc, isDarkMode && styles.mutedTextDark]}>Customer order feedback</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Business snapshot</Text>
            <TouchableOpacity onPress={loadDashboardData}>
              <Text style={styles.linkText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.snapshotCard, isDarkMode && styles.cardDark]}>
            <View style={styles.snapshotRow}>
              <View style={styles.snapshotRowLeft}>
                <Ionicons name="analytics-outline" size={18} color="#5E7897" style={styles.rowIcon} />
                <Text style={[styles.snapshotLabel, isDarkMode && styles.mutedTextDark]}>Total orders</Text>
              </View>
              <Text style={[styles.snapshotValue, isDarkMode && styles.textDark]}>{stats.totalOrders}</Text>
            </View>

            <View style={styles.snapshotRow}>
              <View style={styles.snapshotRowLeft}>
                <Ionicons name="cash-outline" size={18} color="#5E7897" style={styles.rowIcon} />
                <Text style={[styles.snapshotLabel, isDarkMode && styles.mutedTextDark]}>Total earnings</Text>
              </View>
              <Text style={[styles.snapshotValue, isDarkMode && styles.textDark]}>Rs {stats.totalEarnings}</Text>
            </View>

            <View style={[styles.snapshotRow, { borderBottomWidth: 0 }]}>
              <View style={styles.snapshotRowLeft}>
                <Ionicons name="checkbox-outline" size={18} color="#5E7897" style={styles.rowIcon} />
                <Text style={[styles.snapshotLabel, isDarkMode && styles.mutedTextDark]}>Approval status</Text>
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
  containerDark: {
    backgroundColor: "#0B1220"
  },
  cardDark: {
    backgroundColor: "#111827",
    borderColor: "#263449"
  },
  textDark: {
    color: "#E5EDF7"
  },
  mutedTextDark: {
    color: "#9FB0C5"
  },
  metricValueDark: {
    color: "#F8FBFF"
  },
  dividerDark: {
    backgroundColor: "#263449"
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    shadowColor: "#143A66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1
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
  statusBannerOpenDark: {
    backgroundColor: "#12382C",
    borderColor: "#1E6B50"
  },
  statusBannerClosed: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECDD3"
  },
  statusBannerClosedDark: {
    backgroundColor: "#3B171C",
    borderColor: "#7F1D1D"
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
  statusIndicatorCircleDark: {
    backgroundColor: "#0F172A"
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
  statusHeadingOpenDark: {
    color: "#A7F3D0"
  },
  statusHeadingClosed: {
    color: "#991B1B"
  },
  statusHeadingClosedDark: {
    color: "#FECACA"
  },
  statusSubheading: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: "500"
  },
  statusSubheadingOpen: {
    color: "#047857"
  },
  statusSubheadingOpenDark: {
    color: "#6EE7B7"
  },
  statusSubheadingClosed: {
    color: "#B91C1C"
  },
  statusSubheadingClosedDark: {
    color: "#FCA5A5"
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
    justifyContent: "space-between",
    gap: 12
  },
  metricAmountBlock: {
    flex: 1,
    minWidth: 0
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
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F0F6FE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E1EEFE"
  },
  earningsIconContainerDark: {
    backgroundColor: "#1D2A3D",
    borderColor: "#263449"
  },
  walletSummaryButton: {
    maxWidth: "48%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F9FCFF"
  },
  walletSummaryButtonDark: {
    backgroundColor: "#0F172A",
    borderColor: "#263449"
  },
  walletSummaryCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
    marginRight: 4
  },
  walletSummaryLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#5E7897",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  walletSummaryValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "900",
    color: "#143A66"
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
