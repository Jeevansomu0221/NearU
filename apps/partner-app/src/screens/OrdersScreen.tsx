// apps/partner-app/src/screens/OrdersScreen.tsx
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  RefreshControl,
  Alert
} from "react-native";
import api from "../api/client";

// Define Order type
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      console.log("📱 Partner fetching orders...");
      // FIX: Use the correct partner endpoint
      const res = await api.get("/orders/partner/my");
      const response = res.data as OrdersResponse;
      
      console.log("📦 Partner orders response:", response);
      
      if (response.success) {
        setOrders(response.data);
        console.log(`✅ Loaded ${response.data.length} orders`);
      } else {
        Alert.alert("Error", response.message || "Failed to load orders");
      }
    } catch (error: any) {
      console.error("❌ Error loading orders:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      let errorMessage = "Failed to load orders";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message?.includes("Network Error")) {
        errorMessage = "Cannot connect to server. Please check your internet connection.";
      }
      
      Alert.alert("Error", errorMessage);
      
      // For debugging - show what endpoint was called
      console.log("🔍 Endpoint attempted:", error.config?.url);
      console.log("🔍 Base URL:", error.config?.baseURL);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!loading) {
        loadOrders();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "PENDING":
      case "CREATED":
        return "#2196F3";
      case "CONFIRMED":
        return "#4CAF50";
      case "ACCEPTED":
        return "#00BCD4";
      case "PREPARING":
        return "#FF5722";
      case "READY":
        return "#9C27B0";
      case "ASSIGNED":
        return "#FF9800";
      case "PICKED_UP":
        return "#673AB7";
      case "DELIVERED":
        return "#607D8B";
      case "CANCELLED":
        return "#F44336";
      case "REJECTED":
        return "#795548";
      default:
        return "#666";
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case "PENDING": return "Payment Pending";
      case "CONFIRMED": return "Order Placed";
      case "ACCEPTED": return "Accepted";
      case "PREPARING": return "Preparing";
      case "READY": return "Ready";
      case "ASSIGNED": return "Assigned";
      case "PICKED_UP": return "Picked Up";
      case "DELIVERED": return "Delivered";
      case "CANCELLED": return "Cancelled";
      case "REJECTED": return "Rejected";
      default: return status;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate("OrderDetails", { orderId: item._id })}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item._id.slice(-6)}</Text>
          <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      {item.customerId && (
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            👤 {item.customerId.name || "Customer"}
          </Text>
          <Text style={styles.customerPhone}>
            📱 {item.customerId.phone || ""}
          </Text>
        </View>
      )}
      
      {item.items && item.items.slice(0, 2).map((i, idx) => (
        <Text key={idx} style={styles.itemText}>
          • {i.quantity} × {i.name}
        </Text>
      ))}
      
      {item.items && item.items.length > 2 && (
        <Text style={styles.moreItems}>
          +{item.items.length - 2} more items
        </Text>
      )}
      
      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>₹{item.grandTotal || 0}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <TouchableOpacity onPress={loadOrders}>
          <Text style={styles.refreshText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={orders}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={["#FF6B35"]}
            tintColor="#FF6B35"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubText}>
              Orders will appear here when customers place them
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={loadOrders}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={orders.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  refreshText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  orderCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  customerInfo: {
    backgroundColor: '#f0f7ff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: '#666',
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    paddingLeft: 4,
  },
  moreItems: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});