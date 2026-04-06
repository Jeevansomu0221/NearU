import React, { useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api/client";

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
  grandTotal?: number;
}

interface OrdersResponse {
  success: boolean;
  data: Order[];
  message: string;
}

export default function OrdersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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
    }, 30000);
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

  const renderItem = ({ item }: { item: Order }) => {
    const statusTheme = getStatusTheme(item.status);

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

        {item.customerId ? (
          <View style={styles.customerCard}>
            <Text style={styles.customerName}>{item.customerId.name || "Customer"}</Text>
            <Text style={styles.customerPhone}>{item.customerId.phone || ""}</Text>
          </View>
        ) : null}

        {item.items?.slice(0, 2).map((orderItem, idx) => (
          <View key={`${item._id}-${idx}`} style={styles.itemRow}>
            <Text style={styles.itemText}>{orderItem.quantity} x {orderItem.name}</Text>
            <Text style={styles.itemPrice}>Rs {orderItem.quantity * orderItem.price}</Text>
          </View>
        ))}

        {item.items && item.items.length > 2 ? <Text style={styles.moreItems}>+{item.items.length - 2} more items</Text> : null}

        <View style={styles.orderFooter}>
          <Text style={styles.totalLabel}>Grand total</Text>
          <Text style={styles.totalAmount}>Rs {item.grandTotal || 0}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>Track every incoming order from one clean queue.</Text>
        </View>
        <TouchableOpacity onPress={loadOrders}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadOrders} colors={["#FF6B35"]} tintColor="#FF6B35" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubText}>New customer orders will appear here as soon as they come in.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={loadOrders}>
              <Text style={styles.emptyButtonText}>Refresh Orders</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={orders.length === 0 ? styles.emptyList : { paddingHorizontal: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2C2018"
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#7B6D63"
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#C4541C"
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EFE5DA",
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
    color: "#2C2018"
  },
  timeText: {
    fontSize: 12,
    color: "#7B6D63",
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
  customerCard: {
    backgroundColor: "#FFF8F1",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12
  },
  customerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2C2018"
  },
  customerPhone: {
    marginTop: 3,
    fontSize: 12,
    color: "#7B6D63"
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
    color: "#5E5148",
    marginRight: 12
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C2018"
  },
  moreItems: {
    marginTop: 4,
    fontSize: 12,
    color: "#8B6A54"
  },
  orderFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2E9E0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  totalLabel: {
    fontSize: 13,
    color: "#7B6D63"
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FF6B35"
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE5DA",
    borderRadius: 24,
    padding: 24,
    alignItems: "center"
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 8
  },
  emptySubText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7B6D63",
    textAlign: "center",
    marginBottom: 18
  },
  emptyButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  }
});
