import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar
} from "react-native";
import { getMyDeliveryOrders, DeliveryOrder } from "../api/delivery.api";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatAddress } from "../utils/address";
import { getRiderPickupStatusMessage } from "../utils/prepTime";
import HighlightedOrderId from "../components/HighlightedOrderId";
import colors from "../theme/colors";

export default function MyJobsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const highlightOrderId = route?.params?.highlightOrderId;
  const [jobs, setJobs] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMyJobs = async () => {
    try {
      setLoading(true);
      const response = await getMyDeliveryOrders();
      
      if (response.success && response.data) {
        // Sort by status: ASSIGNED first, then PICKED_UP
        const sortedJobs = response.data.sort((a, b) => {
          const statusOrder = { "ASSIGNED": 1, "PICKED_UP": 2, "REACHED_CUSTOMER": 3, "DELIVERED": 4 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 4) - 
                 (statusOrder[b.status as keyof typeof statusOrder] || 4);
        });
        setJobs(sortedJobs);
      } else {
        Alert.alert("Error", response.message || "Failed to load your jobs");
        setJobs([]);
      }
    } catch (error: any) {
      console.error("Error loading jobs:", error);
      Alert.alert("Error", "Failed to load your jobs");
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMyJobs();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        loadMyJobs();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadMyJobs();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ASSIGNED": return "#2196F3"; // Blue
      case "PICKED_UP": return "#FF9800"; // Orange
      case "DELIVERED": return colors.primary;
      default: return "#666";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ASSIGNED": return "time";
      case "PICKED_UP": return "bicycle";
      case "DELIVERED": return "checkmark-done";
      default: return "help";
    }
  };

  const handleJobPress = (job: DeliveryOrder) => {
    navigation.getParent()?.navigate("JobDetails", {
      orderId: job._id,
      job
    });
  };

  const renderJobItem = ({ item }: { item: DeliveryOrder }) => {
    const pickupStops = item.pickupStops?.length
      ? item.pickupStops
      : [{ partnerId: item.partnerId, orderId: item._id, sequence: 1, status: item.status, items: item.items, itemTotal: item.itemTotal, deliveryFee: item.deliveryFee, grandTotal: item.grandTotal }];
    const readyByMessage = getRiderPickupStatusMessage(
      item.deliveryReadyAt,
      item.estimatedReadyAt,
      item.prepTimeMinutes
    );

    return (
      <TouchableOpacity
        style={[styles.jobCard, highlightOrderId === item._id && styles.jobCardHighlighted]}
        onPress={() => handleJobPress(item)}
        activeOpacity={0.9}
      >
      <View style={styles.jobHeader}>
        <View>
          <Text style={styles.orderId}>
            {item.isBundledDelivery ? (
              "Bundled Delivery"
            ) : (
              <HighlightedOrderId
                orderId={item._id}
                prefix="Order #"
                style={styles.orderId}
                highlightStyle={{ color: "#15803D", fontWeight: "800" }}
              />
            )}
          </Text>
          <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status) as any} size={12} color="#FFFFFF" />
          <Text style={styles.statusText}>{item.status.replace("_", " ")}</Text>
        </View>
      </View>

      {readyByMessage && (item.status === "ASSIGNED" || item.status === "READY") ? (
        <View style={styles.readyByBanner}>
          <Ionicons name="time-outline" size={14} color="#1D4E89" />
          <Text style={styles.readyByText}>{readyByMessage}</Text>
        </View>
      ) : null}

      <View style={styles.restaurantInfo}>
        {pickupStops.map((stop, index) => (
          <View key={stop.orderId || `${item._id}-${index}`} style={styles.stopBlock}>
            <View style={styles.stopTitleRow}>
              <View style={styles.pickupDot} />
              <Text style={styles.restaurantName} numberOfLines={1}>
                {pickupStops.length > 1 ? `Pickup ${index + 1} · ` : ""}
                {stop.partnerId?.restaurantName || stop.partnerId?.shopName || "Restaurant"}
              </Text>
            </View>
            <Text style={styles.restaurantAddress}>
              {formatAddress(stop.partnerId?.address, { short: true })}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.deliveryInfo}>
        <View style={styles.stopTitleRow}>
          <View style={styles.dropDot} />
          <Text style={styles.customerName} numberOfLines={1}>
            {item.customerId?.name || "Customer"}
          </Text>
        </View>
        <Text style={styles.deliveryAddress}>
          {formatAddress(item.deliveryAddress, { short: true })}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentMethod}>
            {item.paymentMethod === "CASH_ON_DELIVERY" ? "Cash on delivery" : "Paid online"}
          </Text>
          <Text style={styles.totalAmount}>₹{item.grandTotal || 0}</Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleJobPress(item)}
        >
          <Text style={styles.actionButtonText}>
            {item.status === "DELIVERED" ? "View Details" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerEyebrow}>Active deliveries</Text>
          <Text style={styles.title}>My Jobs</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={jobs}
        keyExtractor={item => item._id}
        renderItem={renderJobItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyHalo}>
              <Ionicons name="bicycle" size={36} color={colors.primaryDark} />
            </View>
            <Text style={styles.emptyText}>No active jobs</Text>
            <Text style={styles.emptySubText}>
              Accept jobs from the Jobs tab to see them here
            </Text>
            <TouchableOpacity 
              style={styles.findJobsButton}
              onPress={() => navigation.navigate("Jobs")}
            >
              <Text style={styles.findJobsButtonText}>Find available jobs</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={jobs.length === 0 ? { flex: 1 } : styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.canvas
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.canvas,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: colors.primary,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.78)",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  jobCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.08)",
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  jobCardHighlighted: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  readyByBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  readyByText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDeep,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  timeText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  restaurantInfo: {
    backgroundColor: colors.primarySoft,
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    gap: 10
  },
  stopBlock: {
    gap: 2
  },
  stopTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary
  },
  dropDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text
  },
  restaurantName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDeep,
  },
  restaurantAddress: {
    fontSize: 13,
    color: colors.primaryDark,
    opacity: 0.9,
    marginLeft: 16
  },
  deliveryInfo: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  customerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  deliveryAddress: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginLeft: 16
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDeep,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyHalo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyText: {
    fontSize: 20,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '800',
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  findJobsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 16,
  },
  findJobsButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 20,
  },
});