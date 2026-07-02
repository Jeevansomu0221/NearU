import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api/client";
import { usePartnerTheme } from "../context/PartnerThemeContext";
import { partnerTheme, type PartnerTheme } from "../theme";

interface Order {
  _id: string;
  status: string;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  customerId?: {
    name: string;
    phone: string;
  };
  deliveryPartnerId?: string | {
    name?: string;
    phone?: string;
  };
  grandTotal?: number;
  itemTotal?: number;
}

const isAwaitingPartnerAction = (status: string) => status === "CONFIRMED";

const getDeliveryPartnerLabel = (deliveryPartner: Order["deliveryPartnerId"]) => {
  if (!deliveryPartner) return "Delivery partner will appear after assignment";
  if (typeof deliveryPartner === "string") return "Delivery partner assigned";

  const name = deliveryPartner.name?.trim();
  if (name) return `Delivery partner: ${name}`;

  const phone = deliveryPartner.phone?.trim();
  if (phone) return `Delivery partner: ${phone}`;

  return "Delivery partner assigned";
};

interface OrdersResponse {
  success: boolean;
  data: Order[];
  message: string;
}

type OrderBucketKey = "current" | "assigned" | "delivery" | "completed";

type OrderBucket = {
  key: OrderBucketKey;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const ORDER_BUCKETS: OrderBucket[] = [
  {
    key: "current",
    title: "Current Orders",
    subtitle: "Yet to accept or reject.",
    icon: "notifications-outline",
    color: partnerTheme.colors.primary
  },
  {
    key: "assigned",
    title: "Assigned",
    subtitle: "Accepted and being prepared.",
    icon: "restaurant-outline",
    color: "#7A4F00"
  },
  {
    key: "delivery",
    title: "Delivery",
    subtitle: "Ready or handed to riders.",
    icon: "bicycle-outline",
    color: "#225EA8"
  },
  {
    key: "completed",
    title: "Completed Orders",
    subtitle: "Delivered orders.",
    icon: "checkmark-circle-outline",
    color: "#216E39"
  }
];

const getOrderBucketKey = (status: string): OrderBucketKey | null => {
  if (status === "CONFIRMED") return "current";
  if (status === "ACCEPTED" || status === "PREPARING") return "assigned";
  if (status === "READY" || status === "ASSIGNED" || status === "PICKED_UP") return "delivery";
  if (status === "DELIVERED") return "completed";
  return null;
};

export default function OrdersScreen({ navigation }: any) {
  const { theme } = usePartnerTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState<OrderBucketKey>("current");

  const loadOrders = async () => {
    try {
      const res = await api.get("/orders/partner/my");
      const response = res.data as OrdersResponse;

      if (response.success) {
        setOrders(response.data);
      } else {
        Alert.alert("Error", response.message || "Failed to load orders");
      }
    } catch (error: any) {
      console.error("Error loading orders:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => {
      if (!loading) {
        loadOrders();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusTheme = (status: string) => {
    switch (status) {
      case "CONFIRMED":
      case "ACCEPTED":
        return { bg: "#DDF8E5", text: "#216E39" };
      case "PREPARING":
      case "READY":
      case "PENDING":
        return { bg: "#FFF2D9", text: "#A15C00" };
      case "ASSIGNED":
      case "PICKED_UP":
        return { bg: "#E8F1FF", text: "#225EA8" };
      case "DELIVERED":
        return { bg: "#EFE8E1", text: "#6B5E55" };
      default:
        return { bg: "#FDE7E7", text: "#B42318" };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Payment Pending";
      case "CONFIRMED":
        return "Order Placed";
      case "ACCEPTED":
        return "Accepted";
      case "PREPARING":
        return "Preparing";
      case "READY":
        return "Ready";
      case "ASSIGNED":
        return "Assigned";
      case "PICKED_UP":
        return "Picked Up";
      case "DELIVERED":
        return "Delivered";
      case "CANCELLED":
        return "Cancelled";
      case "REJECTED":
        return "Rejected";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const orderBuckets = useMemo(() => {
    const grouped: Record<OrderBucketKey, Order[]> = {
      current: [],
      assigned: [],
      delivery: [],
      completed: []
    };

    orders.forEach((order) => {
      const bucketKey = getOrderBucketKey(order.status);
      if (bucketKey) grouped[bucketKey].push(order);
    });

    return grouped;
  }, [orders]);

  const selectedBucketMeta = ORDER_BUCKETS.find((bucket) => bucket.key === selectedBucket) || ORDER_BUCKETS[0];
  const visibleOrders = orderBuckets[selectedBucket];

  const renderItem = ({ item }: { item: Order }) => {
    const statusTheme = getStatusTheme(item.status);
    const foodTotal = item.itemTotal ?? item.items?.reduce((sum, orderItem) => sum + orderItem.quantity * orderItem.price, 0) ?? 0;

    return (
      <TouchableOpacity style={styles.orderCard} onPress={() => navigation.navigate("OrderDetails", { orderId: item._id })}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{item._id.slice(-6)}</Text>
            <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
            <Text style={[styles.statusText, { color: statusTheme.text }]}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.handoffCard}>
          <Text style={styles.handoffLabel}>Parcel handoff</Text>
          <Text style={styles.handoffText}>Order ID #{item._id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.handoffSubtext}>{getDeliveryPartnerLabel(item.deliveryPartnerId)}</Text>
        </View>

        {item.items?.slice(0, 2).map((orderItem, idx) => (
          <View key={`${item._id}-${idx}`} style={styles.itemRow}>
            <Text style={styles.itemText}>
              {orderItem.quantity} x {orderItem.name}
            </Text>
            <Text style={styles.itemPrice}>Rs {orderItem.quantity * orderItem.price}</Text>
          </View>
        ))}

        {item.items && item.items.length > 2 ? <Text style={styles.moreItems}>+{item.items.length - 2} more items</Text> : null}

        <View style={styles.orderFooter}>
          <Text style={styles.totalLabel}>Food total</Text>
          <Text style={styles.totalAmount}>Rs {foodTotal}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBucketTabs = () => (
    <View style={styles.bucketTabsWrap}>
      {ORDER_BUCKETS.map((bucket) => {
        const selected = selectedBucket === bucket.key;
        const count = orderBuckets[bucket.key].length;

        return (
          <TouchableOpacity
            key={bucket.key}
            style={[styles.bucketTab, selected && { backgroundColor: bucket.color, borderColor: bucket.color }]}
            onPress={() => setSelectedBucket(bucket.key)}
          >
            <View style={[styles.bucketIconCircle, selected ? styles.bucketIconCircleSelected : { backgroundColor: `${bucket.color}18` }]}>
              <Ionicons name={bucket.icon} size={16} color={selected ? "#FFFFFF" : bucket.color} />
            </View>
            <Text style={[styles.bucketTabTitle, selected && styles.bucketTabTitleSelected]} numberOfLines={1}>
              {bucket.title}
            </Text>
            <View style={[styles.bucketCountBadge, selected && styles.bucketCountBadgeSelected]}>
              <Text style={[styles.bucketCountText, selected && styles.bucketCountTextSelected]}>{count}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderListHeader = () => (
    <View>
      {renderBucketTabs()}
      <View style={styles.selectedBucketHeader}>
        <View style={[styles.selectedBucketIcon, { backgroundColor: `${selectedBucketMeta.color}18` }]}>
          <Ionicons name={selectedBucketMeta.icon} size={18} color={selectedBucketMeta.color} />
        </View>
        <View style={styles.selectedBucketCopy}>
          <Text style={styles.selectedBucketTitle}>{selectedBucketMeta.title}</Text>
          <Text style={styles.selectedBucketSubtitle}>{selectedBucketMeta.subtitle}</Text>
        </View>
      </View>
      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubText}>New customer orders will appear here as soon as they come in.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={loadOrders}>
            <Text style={styles.emptyButtonText}>Refresh Orders</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  const renderEmptyBucket = () => {
    if (orders.length === 0) return null;

    return (
      <View style={styles.emptyBucketCard}>
        <Ionicons name={selectedBucketMeta.icon} size={24} color={selectedBucketMeta.color} />
        <Text style={styles.emptyBucketTitle}>No {selectedBucketMeta.title.toLowerCase()}</Text>
        <Text style={styles.emptyBucketText}>{selectedBucketMeta.subtitle}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primaryDark} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>Incoming order queue</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={loadOrders}>
            <Ionicons name="refresh" size={21} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadOrders} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyBucket}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const createStyles = (partnerTheme: PartnerTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: partnerTheme.colors.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: partnerTheme.colors.background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: partnerTheme.colors.muted
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: partnerTheme.colors.card,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    marginRight: 10
  },
  headerCopy: {
    flex: 1,
    marginRight: 10
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: partnerTheme.colors.primaryDark
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: partnerTheme.colors.muted
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: partnerTheme.colors.card,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border
  },
  bucketTabsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12
  },
  bucketTab: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    minHeight: 58,
    backgroundColor: partnerTheme.colors.card,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginRight: "2%",
    marginBottom: 8
  },
  bucketIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  bucketIconCircleSelected: {
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  bucketTabTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    color: partnerTheme.colors.primaryDark
  },
  bucketTabTitleSelected: {
    color: "#FFFFFF"
  },
  bucketCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    backgroundColor: partnerTheme.colors.neutralSoft
  },
  bucketCountBadgeSelected: {
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  bucketCountText: {
    fontSize: 11,
    fontWeight: "900",
    color: partnerTheme.colors.primaryDark
  },
  bucketCountTextSelected: {
    color: "#FFFFFF"
  },
  selectedBucketHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: partnerTheme.colors.card,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12
  },
  selectedBucketIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  selectedBucketCopy: {
    flex: 1
  },
  selectedBucketTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: partnerTheme.colors.primaryDark
  },
  selectedBucketSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: partnerTheme.colors.muted
  },
  emptyBucketCard: {
    backgroundColor: partnerTheme.colors.card,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    borderRadius: 22,
    padding: 24,
    alignItems: "center"
  },
  emptyBucketTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: "900",
    color: partnerTheme.colors.primaryDark
  },
  emptyBucketText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: partnerTheme.colors.muted,
    textAlign: "center"
  },
  orderCard: {
    backgroundColor: partnerTheme.colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 16,
    marginBottom: 12
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12
  },
  orderId: {
    fontSize: 16,
    fontWeight: "800",
    color: partnerTheme.colors.primaryDark
  },
  timeText: {
    fontSize: 12,
    color: partnerTheme.colors.muted,
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800"
  },
  handoffCard: {
    backgroundColor: partnerTheme.colors.neutralSoft,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12
  },
  handoffLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: partnerTheme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  handoffText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "800",
    color: partnerTheme.colors.primaryDark
  },
  handoffSubtext: {
    marginTop: 3,
    fontSize: 12,
    color: partnerTheme.colors.muted
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    color: partnerTheme.colors.mutedDark,
    marginRight: 12
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: partnerTheme.colors.primaryDark
  },
  moreItems: {
    marginTop: 4,
    fontSize: 12,
    color: partnerTheme.colors.muted
  },
  orderFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: partnerTheme.colors.borderSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  totalLabel: {
    fontSize: 13,
    color: partnerTheme.colors.muted
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: partnerTheme.colors.primary
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24
  },
  emptyContainer: {
    backgroundColor: partnerTheme.colors.card,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 10
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: partnerTheme.colors.primaryDark,
    marginBottom: 8
  },
  emptySubText: {
    fontSize: 14,
    lineHeight: 20,
    color: partnerTheme.colors.muted,
    textAlign: "center",
    marginBottom: 18
  },
  emptyButton: {
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  emptyButtonText: {
    color: partnerTheme.colors.card,
    fontSize: 14,
    fontWeight: "800"
  }
});
