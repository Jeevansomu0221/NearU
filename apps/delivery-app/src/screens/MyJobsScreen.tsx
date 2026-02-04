import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from "react-native";
import { getMyDeliveryOrders, DeliveryOrder } from "../api/delivery.api";
import { Ionicons } from "@expo/vector-icons";

export default function MyJobsScreen({ navigation }: any) {
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
          const statusOrder = { "ASSIGNED": 1, "PICKED_UP": 2, "DELIVERED": 3 };
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

  const formatAddress = (address: string) => {
    const parts = address.split(',');
    return parts.length > 0 ? parts[0] : address;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ASSIGNED": return "#2196F3"; // Blue
      case "PICKED_UP": return "#FF9800"; // Orange
      case "DELIVERED": return "#4CAF50"; // Green
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
    navigation.navigate("JobDetails", { 
      orderId: job._id,
      job: job
    });
  };

  const renderJobItem = ({ item }: { item: DeliveryOrder }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => handleJobPress(item)}
      activeOpacity={0.9}
    >
      <View style={styles.jobHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item._id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status) as any} size={12} color="#FFFFFF" />
          <Text style={styles.statusText}>{item.status.replace("_", " ")}</Text>
        </View>
      </View>

      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>
          🏪 {item.partnerId?.restaurantName || item.partnerId?.shopName || "Restaurant"}
        </Text>
        <Text style={styles.restaurantAddress}>
          📍 {item.partnerId?.address ? formatAddress(item.partnerId.address) : "Address not available"}
        </Text>
      </View>

      <View style={styles.deliveryInfo}>
        <Text style={styles.deliveryLabel}>Deliver to:</Text>
        <Text style={styles.customerName}>
          👤 {item.customerId?.name || "Customer"}
        </Text>
        <Text style={styles.deliveryAddress}>
          🏠 {formatAddress(item.deliveryAddress)}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentMethod}>
            {item.paymentMethod === "CASH_ON_DELIVERY" ? "💰 COD" : "💳 Online"}
          </Text>
          <Text style={styles.totalAmount}>₹{item.grandTotal}</Text>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Delivery Jobs</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#4CAF50" />
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
            colors={["#4CAF50"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bicycle" size={80} color="#CCCCCC" />
            <Text style={styles.emptyText}>No active jobs</Text>
            <Text style={styles.emptySubText}>
              Accept jobs from the "Available Jobs" tab to see them here
            </Text>
            <TouchableOpacity 
              style={styles.findJobsButton}
              onPress={() => navigation.navigate("Jobs")}
            >
              <Text style={styles.findJobsButtonText}>Find Available Jobs</Text>
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
    backgroundColor: '#f5f5f5' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  jobCard: {
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
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  timeText: {
    fontSize: 13,
    color: '#888',
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
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 13,
    color: '#2E7D32',
    opacity: 0.9,
  },
  deliveryInfo: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  deliveryLabel: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '600',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  deliveryAddress: {
    fontSize: 13,
    color: '#333',
    opacity: 0.9,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  findJobsButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  findJobsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
});