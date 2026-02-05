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
  Platform
} from "react-native";
import { getAvailableJobs, acceptJob, DeliveryJob, calculateDistance } from "../api/delivery.api";
import * as Location from 'expo-location';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // ADD THIS IMPORT

interface CalculatedJob extends DeliveryJob {
  distance?: number;
  travelTime?: number;
  estimatedEarnings?: number;
}

export default function JobsScreen({ navigation }: any) {
  const [jobs, setJobs] = useState<CalculatedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user location
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Permission to access location was denied');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
      } catch (error) {
        console.error("Error getting location:", error);
        setLocationError('Failed to get location');
      }
    })();
  }, []);

  // Add this debug function
  const checkTokenStorage = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const user = await AsyncStorage.getItem("user");
      
      console.log("=== JOBS SCREEN TOKEN CHECK ===");
      console.log("Token exists:", !!token);
      if (token) {
        console.log("Token length:", token.length);
        console.log("Token preview:", token.substring(0, 30) + "...");
      }
      console.log("User exists:", !!user);
      if (user) {
        console.log("User data:", JSON.parse(user));
      }
      console.log("=== END CHECK ===");
    } catch (error) {
      console.error("Error checking token storage:", error);
    }
  };

  const calculateJobDetails = async (job: DeliveryJob): Promise<CalculatedJob> => {
    if (!userLocation || !job.partnerId?.location?.coordinates) {
      return job;
    }

    try {
      // Calculate distance to restaurant
      const origin = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude
      };

      const destination = {
        latitude: job.partnerId.location.coordinates[1],
        longitude: job.partnerId.location.coordinates[0]
      };

      const response = await calculateDistance(origin, destination);
      
      if (response.success && response.data) {
        const distance = response.data.distance; // in km
        const travelTime = response.data.duration; // in minutes
        
        // Calculate estimated earnings
        // Base delivery fee: ₹49 + ₹10 per km beyond 2km
        const baseFee = 49;
        const perKmRate = 10;
        const freeKm = 2;
        
        let estimatedEarnings = baseFee;
        if (distance > freeKm) {
          estimatedEarnings += (distance - freeKm) * perKmRate;
        }
        
        // Add tip if order value is high
        if (job.grandTotal > 500) {
          estimatedEarnings += 20; // ₹20 tip for high-value orders
        }

        return {
          ...job,
          distance: parseFloat(distance.toFixed(1)),
          travelTime: Math.round(travelTime),
          estimatedEarnings: Math.round(estimatedEarnings)
        };
      }
    } catch (error) {
      console.error("Error calculating distance:", error);
    }

    return job;
  };

  const loadAvailableJobs = async () => {
    try {
      // First check token storage
      await checkTokenStorage();
      
      setLoading(true);
      console.log("🔍 Loading available jobs...");
      
      const response = await getAvailableJobs();
      
      console.log("🔍 Jobs API Response:", {
        success: response.success,
        message: response.message,
        dataLength: response.data?.length || 0
      });
      
      if (response.success && response.data) {
        // Calculate distances and earnings for each job
        const jobsWithCalculations = await Promise.all(
          response.data.map(job => calculateJobDetails(job))
        );
        setJobs(jobsWithCalculations);
        console.log(`✅ Loaded ${jobsWithCalculations.length} jobs`);
      } else {
        Alert.alert("Error", response.message || "Failed to load available jobs");
        setJobs([]);
      }
    } catch (error: any) {
      console.error("❌ Error loading jobs:", error);
      Alert.alert("Error", "Failed to load available jobs");
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAvailableJobs();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        loadAvailableJobs();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [userLocation]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh location first
    try {
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    } catch (error) {
      console.error("Error refreshing location:", error);
    }
    await loadAvailableJobs();
  };

  const handleAcceptJob = async (orderId: string, job: CalculatedJob) => {
    try {
      setAcceptingJobId(orderId);
      
      Alert.alert(
        "Accept Delivery Job",
        `Are you sure you want to accept this delivery job?\n\n` +
        `📍 Distance: ${job.distance || 'N/A'} km\n` +
        `⏱️ Estimated Time: ${job.travelTime || 'N/A'} min\n` +
        `💰 Estimated Earnings: ₹${job.estimatedEarnings || job.deliveryFee}`,
        [
          { 
            text: "Cancel", 
            style: "cancel",
            onPress: () => setAcceptingJobId(null)
          },
          {
            text: "Accept Job",
            style: "default",
            onPress: async () => {
              try {
                const response = await acceptJob(orderId);
                
                if (response.success) {
                  Alert.alert(
                    "Success!", 
                    "Job accepted successfully!\n\nYou can now pick up the order from the restaurant.",
                    [
                      {
                        text: "View Details",
                        onPress: () => navigation.getParent()?.navigate("JobDetails", { 
                          orderId: orderId,
                          job: job
                        })
                      },
                      {
                        text: "OK",
                        style: "default"
                      }
                    ]
                  );
                  loadAvailableJobs(); // Refresh the list
                } else {
                  Alert.alert("Error", response.message || "Failed to accept job");
                  setAcceptingJobId(null);
                }
              } catch (error) {
                console.error("Error accepting job:", error);
                Alert.alert("Error", "Failed to accept job");
                setAcceptingJobId(null);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error in handleAcceptJob:", error);
      setAcceptingJobId(null);
    }
  };

  const formatTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid time";
    }
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch (error) {
    return "Invalid time";
  }
};

  const formatAddress = (address: any) => {
  // Handle all cases: undefined, null, not a string
  if (!address || typeof address !== 'string') {
    return "Address not available";
  }
  
  // Show only first part of address for job list
  const parts = address.split(',');
  return parts.length > 0 ? parts[0] : address;
};

  const getItemsSummary = (items: any[]) => {
  if (!items || !Array.isArray(items) || items.length === 0) return "No items";
  const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  return `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
};

  const renderJobItem = ({ item }: { item: CalculatedJob }) => (
  <TouchableOpacity
    style={styles.jobCard}
    onPress={() => navigation.getParent()?.navigate("JobDetails", { 
      orderId: item._id,
      job: item
    })}
    activeOpacity={0.9}
  >
    <View style={styles.jobHeader}>
      <View>
        <Text style={styles.orderId}>Order #{item._id?.slice(-6).toUpperCase() || "N/A"}</Text>
        <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>READY FOR PICKUP</Text>
      </View>
    </View>

    <View style={styles.restaurantInfo}>
      <Text style={styles.restaurantName}>
        🏪 {item.partnerId?.restaurantName || item.partnerId?.shopName || "Restaurant"}
      </Text>
      <Text style={styles.restaurantAddress}>
        📍 {formatAddress(item.partnerId?.address)}
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

    {/* Distance and Earnings Info */}
    <View style={styles.distanceInfo}>
      <View style={styles.distanceItem}>
        <Ionicons name="location" size={16} color="#666" />
        <Text style={styles.distanceText}>
          {item.distance ? `${item.distance} km` : "Distance: --"}
        </Text>
      </View>
      <View style={styles.distanceItem}>
        <Ionicons name="time" size={16} color="#666" />
        <Text style={styles.distanceText}>
          {item.travelTime ? `${item.travelTime} min` : "Time: --"}
        </Text>
      </View>
      <View style={styles.distanceItem}>
        <Ionicons name="cash" size={16} color="#666" />
        <Text style={styles.distanceText}>
          ₹{item.estimatedEarnings || item.deliveryFee || 49}
        </Text>
      </View>
    </View>

    <View style={styles.itemsInfo}>
      <Text style={styles.itemsLabel}>Order Summary:</Text>
      <Text style={styles.itemsText}>
        {getItemsSummary(item.items || [])} • ₹{item.grandTotal || 0}
      </Text>
      {item.note && (
        <Text style={styles.noteText}>Note: {item.note}</Text>
      )}
    </View>

    <View style={styles.footer}>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentMethod}>
          {item.paymentMethod === "CASH_ON_DELIVERY" ? "💰 Cash on Delivery" : "💳 Online Paid"}
        </Text>
        <Text style={styles.totalAmount}>₹{item.grandTotal || 0}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.acceptButton,
          acceptingJobId === item._id && styles.acceptButtonDisabled
        ]}
        onPress={() => handleAcceptJob(item._id, item)}
        disabled={acceptingJobId === item._id}
      >
        {acceptingJobId === item._id ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.acceptButtonText}>Accept Delivery</Text>
        )}
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.title}>Available Delivery Jobs</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="#4CAF50" />
        </TouchableOpacity>
      </View>
      {locationError && (
        <Text style={styles.locationError}>⚠️ {locationError}</Text>
      )}
      {userLocation && (
        <Text style={styles.locationText}>
          📍 Showing jobs near your location
        </Text>
      )}
      
      {/* Debug button */}
      <TouchableOpacity 
        style={styles.debugButton}
        onPress={checkTokenStorage}
      >
        <Text style={styles.debugButtonText}>🔍 Debug Token</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Finding available jobs...</Text>
        {!userLocation && (
          <Text style={styles.locationLoadingText}>Getting your location...</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={jobs}
        keyExtractor={item => item._id}
        renderItem={renderJobItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4CAF50"]}
            tintColor="#4CAF50"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={80} color="#CCCCCC" />
            <Text style={styles.emptyText}>No available jobs</Text>
            <Text style={styles.emptySubText}>
              When restaurants mark orders as READY, they'll appear here for delivery
            </Text>
            <TouchableOpacity 
              style={styles.refreshButtonLarge}
              onPress={onRefresh}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Refresh Jobs</Text>
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
  locationLoadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  locationError: {
    fontSize: 12,
    color: '#FF6B6B',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  debugButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  jobCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
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
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
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
  distanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  distanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  distanceText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  itemsInfo: {
    marginBottom: 12,
  },
  itemsLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
  },
  itemsText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  noteText: {
    fontSize: 13,
    color: '#FF9800',
    fontStyle: 'italic',
    marginTop: 4,
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
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#81C784',
  },
  acceptButtonText: {
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
  refreshButtonLarge: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
});