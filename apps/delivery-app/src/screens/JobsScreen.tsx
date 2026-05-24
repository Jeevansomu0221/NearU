import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { acceptJob, calculateDistance, DeliveryJob, getAvailableJobs, rejectJob, updateLocation } from "../api/delivery.api";
import { getDeliveryProfile, updateDeliveryProfile } from "../api/profile.api";
import { resolveDeliveryRoute } from "../utils/deliveryStatus";
import { formatAddress } from "../utils/address";
import NewJobBanner from "../components/NewJobBanner";

interface CalculatedJob extends DeliveryJob {
  distance?: number | null;
  travelTime?: number | null;
  estimatedEarnings?: number;
}

export default function JobsScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<CalculatedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [newJobAlert, setNewJobAlert] = useState<CalculatedJob | null>(null);
  const [selectedJobAction, setSelectedJobAction] = useState<{ job: CalculatedJob; action: "accept" | "reject" } | null>(null);
  const [emptyMessage, setEmptyMessage] = useState("When restaurants mark orders as READY, they will appear here for delivery.");
  const knownJobIds = useRef<Set<string>>(new Set());
  const firstLoadDone = useRef(false);

  const ensureAccountCanAccessJobs = useCallback(async () => {
    const profileResponse = await getDeliveryProfile();
    if (!profileResponse.success || !profileResponse.data) {
      return false;
    }

    const nextRoute = resolveDeliveryRoute(profileResponse.data);
    if (nextRoute !== "Main") {
      navigation.getParent()?.reset({
        index: 0,
        routes: [{ name: nextRoute }]
      });
      return false;
    }

    return true;
  }, [navigation]);

  const refreshLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission is off. Turn it on to see nearby jobs.");
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
      setLocationError(null);
      return location;
    } catch {
      setLocationError("Unable to get your current location.");
      return null;
    }
  }, []);

  const calculateJobDetails = useCallback(
    async (job: DeliveryJob): Promise<CalculatedJob> => {
      if (typeof job.distanceToRestaurant === "number") {
        return {
          ...job,
          distance: Number(job.distanceToRestaurant.toFixed(1))
        };
      }

      if (job.distanceToRestaurant === null) {
        // Backend told us the shop hasn't pinned its location yet.
        return { ...job, distance: null, travelTime: null };
      }

      if (!userLocation || !job.partnerId?.location?.coordinates) {
        return job;
      }

      try {
        const response = await calculateDistance(
          {
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude
          },
          {
            latitude: job.partnerId.location.coordinates[1],
            longitude: job.partnerId.location.coordinates[0]
          }
        );

        if (response.success && response.data) {
          const distance = response.data.distance;
          const travelTime = response.data.duration;
          const baseFee = 49;
          const extraDistance = Math.max(distance - 2, 0);
          const estimatedEarnings = baseFee + extraDistance * 10 + (job.grandTotal > 500 ? 20 : 0);

          return {
            ...job,
            distance: Number(distance.toFixed(1)),
            travelTime: Math.round(travelTime),
            estimatedEarnings: Math.round(estimatedEarnings)
          };
        }
      } catch {
        return job;
      }

      return job;
    },
    [userLocation]
  );

  const loadAvailableJobs = useCallback(async () => {
    try {
      const canAccessJobs = await ensureAccountCanAccessJobs();
      if (!canAccessJobs) {
        setJobs([]);
        return;
      }

      const response = await getAvailableJobs();
      if (response.success && response.data) {
        setEmptyMessage(response.message || "When restaurants mark orders as READY, they will appear here for delivery.");
        const jobsWithCalculations = await Promise.all(response.data.map((job) => calculateJobDetails(job)));
        const incomingIds = new Set(jobsWithCalculations.map((job) => job._id));
        const newlyAdded = jobsWithCalculations.filter((job) => !knownJobIds.current.has(job._id));
        knownJobIds.current = incomingIds;

        if (firstLoadDone.current && newlyAdded.length > 0) {
          setNewJobAlert(newlyAdded[0]);
        }
        firstLoadDone.current = true;
        setJobs(jobsWithCalculations);
      } else {
        setEmptyMessage(response.message || "When restaurants mark orders as READY, they will appear here for delivery.");
        setJobs([]);
      }
    } catch {
      setJobs([]);
      Alert.alert("Could not load jobs", "Please check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calculateJobDetails, ensureAccountCanAccessJobs]);

  useEffect(() => {
    refreshLocation().catch(() => {});
    loadAvailabilityPreference();
  }, [refreshLocation]);

  const loadAvailabilityPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem("driverAvailability");
      if (saved !== null) {
        setIsAvailable(saved === "true");
      }
    } catch (error) {
      console.error("Failed to load availability preference", error);
    }
  };

  const toggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    try {
      await AsyncStorage.setItem("driverAvailability", value.toString());
      await updateDeliveryProfile({ isAvailable: value });
    } catch (error) {
      console.error("Failed to save availability preference", error);
    }
  };

  useEffect(() => {
    loadAvailableJobs();
    // Poll every 10s so new READY orders surface quickly with a banner alert.
    const interval = setInterval(loadAvailableJobs, 10000);
    return () => clearInterval(interval);
  }, [loadAvailableJobs]);

  useEffect(() => {
    if (!userLocation) return;

    updateLocation({
      latitude: userLocation.coords.latitude,
      longitude: userLocation.coords.longitude
    }).catch(() => {});
  }, [userLocation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshLocation();
    await loadAvailableJobs();
  };

  const handleAcceptJob = (job: CalculatedJob) => {
    setSelectedJobAction({ job, action: "accept" });
  };

  const handleRejectJob = (job: CalculatedJob) => {
    setSelectedJobAction({ job, action: "reject" });
  };

  const confirmSelectedJobAction = async () => {
    if (!selectedJobAction) return;

    const { job, action } = selectedJobAction;
    setAcceptingJobId(job._id);

    try {
      const response = action === "accept" ? await acceptJob(job._id) : await rejectJob(job._id);
      if (response.success) {
        setSelectedJobAction(null);
        setNewJobAlert(null);
        setJobs((current) => current.filter((entry) => entry._id !== job._id));
        if (action === "accept") {
          navigation.getParent()?.navigate("JobDetails", { orderId: job._id, job: response.data || job });
        }
        loadAvailableJobs();
      } else {
        Alert.alert(action === "accept" ? "Could not accept job" : "Could not reject job", response.message || "Please try again.");
      }
    } finally {
      setAcceptingJobId(null);
    }
  };

  const handleBannerAccept = async () => {
    if (!newJobAlert) return;
    const job = newJobAlert;
    setNewJobAlert(null);
    setAcceptingJobId(job._id);
    const response = await acceptJob(job._id);
    setAcceptingJobId(null);
    if (response.success) {
      navigation.getParent()?.navigate("JobDetails", { orderId: job._id, job: response.data || job });
      loadAvailableJobs();
    } else {
      Alert.alert("Could not accept job", response.message || "Please try again.");
    }
  };

  const handleBannerOpen = () => {
    if (!newJobAlert) return;
    const job = newJobAlert;
    setNewJobAlert(null);
    navigation.getParent()?.navigate("JobDetails", { orderId: job._id, job });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Time unavailable";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getItemsSummary = (items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) return "No items";
    const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    return `${totalItems} item${totalItems === 1 ? "" : "s"}`;
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <View style={styles.headerTop}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, width < 380 && styles.titleCompact]} numberOfLines={2}>
            Available Jobs
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton} accessibilityLabel="Refresh jobs">
          <Ionicons name="refresh" size={22} color="#4CAF50" />
        </TouchableOpacity>
      </View>
      <View style={styles.availabilityRow}>
        <View style={styles.availabilityText}>
          <Text style={styles.availabilityLabel}>{isAvailable ? "Available to deliver now" : "Not available for delivery"}</Text>
          {locationError ? <Text style={styles.availabilitySubLabel}>{locationError}</Text> : null}
        </View>
        <Switch
          value={isAvailable}
          onValueChange={toggleAvailability}
          trackColor={{ false: "#E5E7EB", true: "#4CAF50" }}
          thumbColor={isAvailable ? "#FFFFFF" : "#FFFFFF"}
          ios_backgroundColor="#E5E7EB"
        />
      </View>
    </View>
  );

  const renderJobItem = ({ item }: { item: CalculatedJob }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => navigation.getParent()?.navigate("JobDetails", { orderId: item._id, job: item })}
      activeOpacity={0.9}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobTitleBlock}>
          <Text style={styles.orderId}>Order #{item._id?.slice(-6).toUpperCase() || "N/A"}</Text>
          <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>READY</Text>
        </View>
      </View>

      <View style={styles.routeCard}>
        <View style={styles.routeRow}>
          <Ionicons name="storefront-outline" size={18} color="#2E7D32" />
          <View style={styles.routeTextBlock}>
            <Text style={styles.restaurantName}>{item.partnerId?.restaurantName || item.partnerId?.shopName || "Restaurant"}</Text>
            <Text style={styles.routeSubText}>{formatAddress(item.partnerId?.address, { short: true })}</Text>
          </View>
        </View>
        <View style={styles.routeDivider} />
        <View style={styles.routeRow}>
          <Ionicons name="home-outline" size={18} color="#1565C0" />
          <View style={styles.routeTextBlock}>
            <Text style={styles.customerName}>{item.customerId?.name || "Customer"}</Text>
            <Text style={styles.routeSubText}>{formatAddress(item.deliveryAddress, { short: true })}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <Metric
          icon="location-outline"
          label={typeof item.distance === "number" ? `${item.distance} km` : "Distance pending"}
        />
        <Metric
          icon="time-outline"
          label={typeof item.travelTime === "number" ? `${item.travelTime} min` : "-- min"}
        />
        <Metric icon="cash-outline" label={`Rs ${item.estimatedEarnings || item.deliveryFee || 49}`} />
      </View>

      <View style={styles.footer}>
        <View style={styles.paymentInfo}>
          <Text style={styles.itemsText}>{getItemsSummary(item.items || [])}</Text>
          <Text style={styles.totalAmount}>Rs {item.grandTotal || 0}</Text>
        </View>
        <TouchableOpacity
          style={[styles.acceptButton, acceptingJobId === item._id && styles.acceptButtonDisabled]}
          onPress={() => handleAcceptJob(item)}
          disabled={acceptingJobId === item._id}
        >
          {acceptingJobId === item._id ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.acceptButtonText}>Accept</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleRejectJob(item)}
          disabled={acceptingJobId === item._id}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Finding available jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NewJobBanner
        visible={Boolean(newJobAlert)}
        job={newJobAlert}
        onOpen={handleBannerOpen}
        onAccept={handleBannerAccept}
        onDismiss={() => setNewJobAlert(null)}
      />
      {renderHeader()}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item._id}
        renderItem={renderJobItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} tintColor="#4CAF50" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={72} color="#CCCCCC" />
            <Text style={styles.emptyText}>No available jobs</Text>
            <Text style={styles.emptySubText}>{emptyMessage}</Text>
            <TouchableOpacity style={styles.refreshButtonLarge} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Refresh Jobs</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={[
          jobs.length === 0 ? styles.emptyListContent : styles.listContent,
          { paddingBottom: insets.bottom + 24 }
        ]}
      />
      <Modal
        visible={Boolean(selectedJobAction)}
        transparent
        animationType="fade"
        onRequestClose={() => !acceptingJobId && setSelectedJobAction(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmEyebrow}>Delivery job</Text>
            <Text style={styles.confirmTitle}>
              {selectedJobAction?.action === "accept" ? "Accept this delivery?" : "Reject this delivery?"}
            </Text>
            <Text style={styles.confirmText}>
              {selectedJobAction?.action === "accept"
                ? "You will go directly to the job details for pickup and delivery."
                : "This job will be removed from your available list and remain open for other delivery partners."}
            </Text>
            {selectedJobAction?.job ? (
              <View style={styles.confirmMetaCard}>
                <Text style={styles.confirmMetaTitle}>Order #{selectedJobAction.job._id.slice(-6).toUpperCase()}</Text>
                <Text style={styles.confirmMetaText}>
                  {selectedJobAction.job.partnerId?.restaurantName || selectedJobAction.job.partnerId?.shopName || "Restaurant"}
                </Text>
                <Text style={styles.confirmMetaText}>
                  Earnings Rs {selectedJobAction.job.estimatedEarnings || selectedJobAction.job.deliveryFee || 49}
                </Text>
              </View>
            ) : null}
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmSecondary} onPress={() => setSelectedJobAction(null)} disabled={Boolean(acceptingJobId)}>
                <Text style={styles.confirmSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmPrimary, selectedJobAction?.action === "reject" && styles.confirmDanger]}
                onPress={confirmSelectedJobAction}
                disabled={Boolean(acceptingJobId)}
              >
                {acceptingJobId ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmPrimaryText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Metric({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metricItem}>
      <Ionicons name={icon} size={16} color="#666" />
      <Text style={styles.metricText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA"
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  headerCopy: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: "#222222",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30
  },
  titleCompact: {
    fontSize: 21,
    lineHeight: 27
  },
  locationText: {
    marginTop: 8,
    color: "#667085",
    fontSize: 15,
    lineHeight: 22
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4"
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6"
  },
  availabilityText: {
    flex: 1,
    minWidth: 0
  },
  availabilityLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222222"
  },
  availabilitySubLabel: {
    fontSize: 13,
    color: "#667085",
    marginTop: 2
  },
  jobCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5
      },
      android: {
        elevation: 2
      }
    })
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12
  },
  jobTitleBlock: {
    flex: 1,
    minWidth: 0
  },
  orderId: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333333"
  },
  timeText: {
    fontSize: 13,
    color: "#888888",
    marginTop: 4
  },
  statusBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800"
  },
  routeCard: {
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    marginBottom: 12
  },
  routeRow: {
    flexDirection: "row",
    gap: 10
  },
  routeTextBlock: {
    flex: 1,
    minWidth: 0
  },
  restaurantName: {
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "700"
  },
  customerName: {
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "700"
  },
  routeSubText: {
    marginTop: 4,
    color: "#667085",
    fontSize: 13,
    lineHeight: 18
  },
  routeDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12
  },
  metricsRow: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
    gap: 4
  },
  metricText: {
    color: "#666666",
    fontSize: 13,
    fontWeight: "700"
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE"
  },
  paymentInfo: {
    flex: 1,
    minWidth: 0
  },
  itemsText: {
    color: "#667085",
    fontSize: 13,
    fontWeight: "600"
  },
  totalAmount: {
    color: "#333333",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 3
  },
  acceptButton: {
    minWidth: 112,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  acceptButtonDisabled: {
    backgroundColor: "#81C784"
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  rejectButton: {
    minWidth: 88,
    backgroundColor: "#FFF1F1",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD1D1"
  },
  rejectButtonText: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "800"
  },
  emptyListContent: {
    flexGrow: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 80
  },
  emptyText: {
    fontSize: 20,
    color: "#555555",
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "800"
  },
  emptySubText: {
    fontSize: 15,
    color: "#888888",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22
  },
  refreshButtonLarge: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  listContent: {
    paddingBottom: 24
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "center",
    paddingHorizontal: 22
  },
  confirmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#DFF3E3"
  },
  confirmEyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: "#2E7D32",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  confirmTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    color: "#1F2937"
  },
  confirmText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#667085"
  },
  confirmMetaCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F8FAFC"
  },
  confirmMetaTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1F2937"
  },
  confirmMetaText: {
    marginTop: 4,
    fontSize: 13,
    color: "#667085"
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18
  },
  confirmSecondary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#F3F4F6"
  },
  confirmSecondaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475467"
  },
  confirmPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#4CAF50"
  },
  confirmDanger: {
    backgroundColor: "#B42318"
  },
  confirmPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF"
  }
});
