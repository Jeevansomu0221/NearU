// apps/partner-app/src/screens/OrdersScreen.tsx
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  RefreshControl,
  Alert // Added Alert import
} from "react-native";
import api from "../api/client";

// Remove socket.io for now (optional)
// import io from "socket.io-client";

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

  const loadOrders = async () => {
    try {
      const res = await api.get("/orders/my");
      const response = res.data as OrdersResponse;
      
      if (response.success) {
        setOrders(response.data);
      } else {
        Alert.alert("Error", response.message);
      }
    } catch (error: any) {
      console.error("Error loading orders:", error);
      Alert.alert("Error", "Failed to load orders");
    }
  };

  useEffect(() => {
    loadOrders();
    
    // Optional: Add WebSocket later
    /*
    const socket = io("http://your-backend-url");
    socket.on("order:new", (data) => {
      Alert.alert("New Order!", data.message);
      loadOrders();
    });
    
    return () => {
      socket.disconnect();
    };
    */
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "CREATED":
      case "PRICED":
        return "#2196F3";
      case "CONFIRMED":
        return "#4CAF50";
      case "ASSIGNED":
        return "#FF9800";
      case "PREPARING":
        return "#FF5722";
      case "READY":
        return "#9C27B0";
      case "PICKED_UP":
        return "#673AB7";
      case "DELIVERED":
        return "#607D8B";
      case "CANCELLED":
        return "#F44336";
      default:
        return "#666";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
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
        <Text style={styles.orderId}>Order #{item._id.slice(-6)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.timeText}>
        {formatTime(item.createdAt)}
      </Text>
      
      {item.items && item.items.slice(0, 2).map((i, idx) => (
        <Text key={idx} style={styles.itemText}>
          {i.quantity} × {i.name}
        </Text>
      ))}
      
      {item.items && item.items.length > 2 && (
        <Text style={styles.moreItems}>
          +{item.items.length - 2} more items
        </Text>
      )}
      
      <View style={styles.orderFooter}>
        <Text style={styles.customerName}>
          {item.customerId?.name || "Customer"}
        </Text>
        <Text style={styles.totalAmount}>
          ₹{item.grandTotal || 0}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={["#FF6B35"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubText}>
              Orders will appear here when customers place them
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
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
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  moreItems: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  customerName: {
    fontSize: 14,
    color: '#333',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});