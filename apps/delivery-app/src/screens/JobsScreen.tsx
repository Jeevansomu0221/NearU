import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import { getOrderRiderEarnings } from "../utils/riderEarnings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { acceptJob, calculateDistance, DeliveryJob, getAvailableJobs, getDeliveryStats, getMyDeliveryOrders, getWithdrawalWallet, rejectJob, updateLocation } from "../api/delivery.api";
import { getDeliveryProfile, updateDeliveryProfile } from "../api/profile.api";
import { resolveDeliveryRoute } from "../utils/deliveryStatus";
import { formatAddress } from "../utils/address";
import { getCurrentRiderLocation } from "../utils/riderLocation";
import NewJobBanner from "../components/NewJobBanner";

const AVAILABILITY_STORAGE_KEY = "driverAvailability";
const GREEN_PRIMARY = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_DEEP = "#166534";
const GREEN_SOFT = "#DCFCE7";

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
  const [isAvailable, setIsAvailable] = useState(false);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [newJobAlert, setNewJobAlert] = useState<CalculatedJob | null>(null);
  const [selectedJobAction, setSelectedJobAction] = useState<{ job: CalculatedJob; action: "accept" | "reject" } | null>(null);
  const [emptyMessage, setEmptyMessage] = useState("When restaurants mark orders as READY, they will appear here for delivery.");
  const [riderName, setRiderName] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [todaysDeliveries, setTodaysDeliveries] = useState(0);
  const knownJobIds = useRef<Set<string>>(new Set());
  const rejectedJobIds = useRef<Set<string>>(new Set());
  const firstLoadDone = useRef(false);

  const applyAvailabilityPreference = useCallback((value: boolean) => {
    setIsAvailable(value);
    setAvailabilityLoaded(true);
    AsyncStorage.setItem(AVAILABILITY_STORAGE_KEY, value.toString()).catch(() => {});
  }, []);

  const ensureAccountCanAccessJobs = useCallback(async () => {
    const profileResponse = await getDeliveryProfile();
    if (!profileResponse.success || !profileResponse.data) {
      return false;
    }
    applyAvailabilityPreference(typeof profileResponse.data.isAvailable === "boolean" ? profileResponse.data.isAvailable : true);
    const nextRoute = resolveDeliveryRoute(profileResponse.data);
    if (nextRoute !== "Main") {
      navigation.getParent()?.reset({
        index: 0,
        routes: [{ name: nextRoute }]
      });
      return false;
    }
    return true;
  }, [applyAvailabilityPreference, navigation]);

  const refreshLocation = useCallback(async (showDeniedAlert = false) => {
    const location = await getCurrentRiderLocation({ showDeniedAlert });
    if (!location) {
      setLocationError("Location permission is off. Turn it on to see nearby jobs.");
      return null;
    }

    setUserLocation(location);
    setLocationError(null);
    return location;
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
          return {
            ...job,
            distance: Number(distance.toFixed(1)),
            travelTime: Math.round(travelTime)
          };
        }
      } catch {
        return job;
      }
      return job;
    },
    [userLocation]
  );

  const loadHeaderStats = useCallback(async () => {
    try {
      const [statsResponse, profileResponse, walletResponse] = await Promise.all([
        getDeliveryStats(),
        getDeliveryProfile(),
        getWithdrawalWallet()
      ]);
      if (statsResponse.success && statsResponse.data) {
        setTodaysDeliveries(statsResponse.data.todaysDeliveries || 0);
      }
      if (walletResponse.success && walletResponse.data) {
        setWalletBalance(walletResponse.data.walletBalance || 0);
      } else if (statsResponse.success && statsResponse.data) {
        setWalletBalance(statsResponse.data.walletBalance || 0);
      }
      if (profileResponse.success && profileResponse.data?.name) {
        setRiderName(profileResponse.data.name.trim());
      }
    } catch {
      // silent
    }
  }, []);

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
        const visibleJobs = jobsWithCalculations.filter((job) => !rejectedJobIds.current.has(job._id));
        const incomingIds = new Set(visibleJobs.map((job) => job._id));
        const newlyAdded = visibleJobs.filter((job) => !knownJobIds.current.has(job._id));
        knownJobIds.current = incomingIds;
        if (firstLoadDone.current && newlyAdded.length > 0) {
          setNewJobAlert(newlyAdded[0]);
        }
        firstLoadDone.current = true;
        setJobs(visibleJobs);
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
    refreshLocation(false).catch(() => {});
  }, [refreshLocation]);

  const loadAvailabilityPreference = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(AVAILABILITY_STORAGE_KEY);
      if (saved !== null) {
        applyAvailabilityPreference(saved === "true");
      }
      const profileResponse = await getDeliveryProfile();
      if (profileResponse.success && profileResponse.data) {
        applyAvailabilityPreference(typeof profileResponse.data.isAvailable === "boolean" ? profileResponse.data.isAvailable : true);
      } else if (saved === null) {
        setAvailabilityLoaded(true);
      }
    } catch (error) {
      console.error("Failed to load availability preference", error);
      setAvailabilityLoaded(true);
    }
  }, [applyAvailabilityPreference]);

  useFocusEffect(
    useCallback(() => {
      loadAvailabilityPreference().catch(() => {});
      loadHeaderStats().catch(() => {});
    }, [loadAvailabilityPreference, loadHeaderStats])
  );

  const toggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    setAvailabilityLoaded(true);
    try {
      await AsyncStorage.setItem(AVAILABILITY_STORAGE_KEY, value.toString());
      await updateDeliveryProfile({ isAvailable: value });
    } catch (error) {
      const revertedValue = !value;
      setIsAvailable(revertedValue);
      await AsyncStorage.setItem(AVAILABILITY_STORAGE_KEY, revertedValue.toString()).catch(() => {});
      console.error("Failed to save availability preference", error);
    }
  };

  useEffect(() => {
    loadAvailableJobs();
    loadHeaderStats();
    const interval = setInterval(loadAvailableJobs, 10000);
    return () => clearInterval(interval);
  }, [loadAvailableJobs, loadHeaderStats]);

  useEffect(() => {
    if (!userLocation) return;
    updateLocation({
      latitude: userLocation.coords.latitude,
      longitude: userLocation.coords.longitude
    }).catch(() => {});
  }, [userLocation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshLocation(true);
    await Promise.all([loadAvailableJobs(), loadHeaderStats()]);
  };

  const handleAcceptJob = (job: CalculatedJob) => {
    setSelectedJobAction({ job, action: "accept" });
  };

  const handleRejectJob = (job: CalculatedJob) => {
    setSelectedJobAction({ job, action: "reject" });
  };

  const isActiveDeliveryBlock = (response: any) => {
    const message = String(response?.message || "").toLowerCase();
    return response?.errors?.code === "ACTIVE_DELIVERY_EXISTS" || message.includes("current delivery");
  };

  const promptToContinueActiveDelivery = async (response: any) => {
    const activeOrderId = response?.errors?.activeOrderId;
    const myOrdersResponse = await getMyDeliveryOrders();
    const activeOrder = myOrdersResponse.success
      ? myOrdersResponse.data?.find((order) => order._id === activeOrderId) ||
        myOrdersResponse.data?.find((order) => ["ASSIGNED", "PICKED_UP"].includes(order.status))
      : null;
    const orderLabel = activeOrder?._id ? ` #${activeOrder._id.slice(-6).toUpperCase()}` : "";
    Alert.alert(
      "Finish current delivery",
      `You already have an active delivery${orderLabel}. Complete it before accepting another job.`,
      [
        { text: "Not now", style: "cancel" },
        {
          text: activeOrder ? "Continue Delivery" : "Open My Jobs",
          onPress: () => {
            if (activeOrder) {
              navigation.getParent()?.navigate("JobDetails", { orderId: activeOrder._id, job: activeOrder });
              return;
            }
            navigation.navigate("MyJobs", activeOrderId ? { highlightOrderId: activeOrderId } : undefined);
          }
        }
      ]
    );
  };

  const confirmSelectedJobAction = async () => {
    if (!selectedJobAction) return;
    const { job, action } = selectedJobAction;
    setAcceptingJobId(job._id);
    try {
      const response = action === "accept" ? await acceptJob(job._id) : await rejectJob(job._id);
      if (response.success) {
        if (action === "reject") {
          rejectedJobIds.current.add(job._id);
        }
        setSelectedJobAction(null);
        setNewJobAlert(null);
        setJobs((current) => current.filter((entry) => entry._id !== job._id));
        if (action === "accept") {
          navigation.getParent()?.navigate("JobDetails", { orderId: job._id, job: response.data || job });
        }
        loadAvailableJobs();
      } else {
        if (action === "accept" && isActiveDeliveryBlock(response)) {
          setSelectedJobAction(null);
          await promptToContinueActiveDelivery(response);
          return;
        }
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
      if (isActiveDeliveryBlock(response)) {
        await promptToContinueActiveDelivery(response);
        return;
      }
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
    <View>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting} numberOfLines={1}>
              Hello, {riderName || "Rider"}
            </Text>
            <Text style={[styles.title, width < 380 && styles.titleCompact]}>
              Available Jobs
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton} accessibilityLabel="Refresh jobs">
            <Ionicons name="refresh" size={20} color={GREEN_DEEP} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{walletBalance.toLocaleString("en-IN")}</Text>
            <Text style={styles.statLabel}>Wallet</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todaysDeliveries}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.availabilityCard, availabilityLoaded && isAvailable ? styles.availabilityCardOnline : styles.availabilityCardOffline]}
        onPress={() => availabilityLoaded && toggleAvailability(!isAvailable)}
        activeOpacity={0.85}
        disabled={!availabilityLoaded}
      >
        <View style={styles.availabilityLeft}>
          <View style={[styles.availabilityDot, availabilityLoaded && isAvailable && styles.availabilityDotOnline]} />
          <View>
            <Text style={[styles.availabilityTitle, (!availabilityLoaded || !isAvailable) && styles.availabilityTitleOffline]}>
              {!availabilityLoaded ? "Checking status" : isAvailable ? "You're online" : "You're offline"}
            </Text>
            <Text style={styles.availabilitySub}>
              {!availabilityLoaded
                ? "Syncing your availability"
                : isAvailable
                ? "New job alerts are active"
                : "Tap to go online and receive jobs"}
            </Text>
          </View>
        </View>
        <View style={[styles.availabilityToggle, availabilityLoaded && isAvailable ? styles.availabilityToggleOnline : styles.availabilityToggleOffline]}>
          <Text style={[styles.availabilityToggleText, availabilityLoaded && isAvailable && styles.availabilityToggleTextOnline]}>
            {!availabilityLoaded ? "..." : isAvailable ? "ON" : "OFF"}
          </Text>
        </View>
      </TouchableOpacity>

      {locationError ? (
        <View style={styles.locationBanner}>
          <Ionicons name="location-outline" size={16} color="#B42318" />
          <Text style={styles.locationBannerText}>{locationError}</Text>
        </View>
      ) : null}
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonRow}>
            <View style={styles.skeletonBlock} />
            <View style={[styles.skeletonBlock, { width: 60 }]} />
          </View>
          <View style={[styles.skeletonBlock, { width: "80%", marginTop: 12 }]} />
          <View style={[styles.skeletonBlock, { width: "60%", marginTop: 8 }]} />
          <View style={styles.skeletonMetrics}>
            <View style={[styles.skeletonBlock, { width: 80 }]} />
            <View style={[styles.skeletonBlock, { width: 80 }]} />
            <View style={[styles.skeletonBlock, { width: 80 }]} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderJobItem = ({ item }: { item: CalculatedJob }) => {
    const earnings = getOrderRiderEarnings(item);
    const accepted = acceptingJobId === item._id;
    const pickupStops = item.pickupStops?.length
      ? item.pickupStops
      : [{ partnerId: item.partnerId, orderId: item._id, sequence: 1, status: item.status, items: item.items, itemTotal: item.itemTotal, deliveryFee: item.deliveryFee, grandTotal: item.grandTotal }];
    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => navigation.getParent()?.navigate("JobDetails", { orderId: item._id, job: item })}
        activeOpacity={0.9}
      >
        <View style={styles.jobTop}>
          <View style={styles.jobTopLeft}>
            <Text style={styles.orderId}>
              {item.isBundledDelivery ? "Bundled Job" : `#${item._id?.slice(-6).toUpperCase() || "N/A"}`}
            </Text>
            <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
          </View>
          <View style={styles.jobEarningsBadge}>
            <Text style={styles.jobEarningsValue}>Rs {earnings}</Text>
            <Text style={styles.jobEarningsLabel}>earnings</Text>
          </View>
        </View>

        <View style={styles.routeSection}>
          <View style={styles.routeStop}>
            <View style={styles.routePinStore} />
            <View style={styles.routeLine} />
            <View style={styles.routePinHome} />
          </View>
          <View style={styles.routeInfo}>
            {pickupStops.map((stop, index) => (
              <View key={stop.orderId || `${item._id}-${index}`} style={styles.routeInfoBlock}>
                <Text style={styles.routeName}>
                  Pickup {pickupStops.length > 1 ? index + 1 : ""} {stop.partnerId?.restaurantName || stop.partnerId?.shopName || "Restaurant"}
                </Text>
                <Text style={styles.routeAddress} numberOfLines={1}>{formatAddress(stop.partnerId?.address, { short: true })}</Text>
              </View>
            ))}
            <View style={styles.routeInfoBlock}>
              <Text style={styles.routeName}>{item.customerId?.name || "Customer"}</Text>
              <Text style={styles.routeAddress} numberOfLines={1}>{formatAddress(item.deliveryAddress, { short: true })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Ionicons name="location-outline" size={15} color="#667085" />
            <Text style={styles.metricText}>
              {typeof item.distance === "number" ? `${item.distance} km` : "--"}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={15} color="#667085" />
            <Text style={styles.metricText}>
              {typeof item.travelTime === "number" ? `${item.travelTime} min` : "-- min"}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Ionicons name="basket-outline" size={15} color="#667085" />
            <Text style={styles.metricText}>{getItemsSummary(item.items || [])}</Text>
          </View>
        </View>

        <View style={styles.jobFooter}>
          <View style={styles.jobFooterLeft}>
            <Text style={styles.jobFooterTotal}>Rs {item.grandTotal || 0}</Text>
            <Text style={styles.jobFooterTotalLabel}>order value</Text>
          </View>
          <View style={styles.jobFooterActions}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => handleRejectJob(item)}
              disabled={Boolean(acceptingJobId)}
            >
              <Ionicons name="close" size={16} color="#B42318" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, accepted && styles.acceptBtnBusy]}
              onPress={() => handleAcceptJob(item)}
              disabled={Boolean(acceptingJobId)}
            >
              {accepted ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderSkeleton()}
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
      <FlatList
        data={jobs}
        keyExtractor={(item) => item._id}
        renderItem={renderJobItem}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN_PRIMARY]} tintColor={GREEN_PRIMARY} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="bicycle-outline" size={48} color="#D0D5DD" />
            </View>
            <Text style={styles.emptyTitle}>No jobs available</Text>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
            <TouchableOpacity style={styles.emptyRefreshBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.emptyRefreshText}>Refresh Now</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={[
          jobs.length === 0 ? styles.emptyListContent : styles.listContent,
          { paddingBottom: insets.bottom + 24 }
        ]}
        showsVerticalScrollIndicator={false}
      />
      <Modal
        visible={Boolean(selectedJobAction)}
        transparent
        animationType="fade"
        onRequestClose={() => !acceptingJobId && setSelectedJobAction(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIconWrap, selectedJobAction?.action === "reject" && styles.confirmIconWrapDanger]}>
              <Ionicons
                name={selectedJobAction?.action === "accept" ? "checkmark-circle" : "close-circle"}
                size={40}
                color={selectedJobAction?.action === "reject" ? "#B42318" : "#4CAF50"}
              />
            </View>
            <Text style={styles.confirmTitle}>
              {selectedJobAction?.action === "accept" ? "Accept this delivery?" : "Reject this delivery?"}
            </Text>
            <Text style={styles.confirmText}>
              {selectedJobAction?.action === "accept"
                ? "You'll be taken to the job details for pickup and delivery."
                : "This job will be removed from your list and stay open for other riders."}
            </Text>
            {selectedJobAction?.job ? (
              <View style={styles.confirmMeta}>
                <View style={styles.confirmMetaRow}>
                  <Text style={styles.confirmMetaLabel}>Order</Text>
                  <Text style={styles.confirmMetaValue}>#{selectedJobAction.job._id.slice(-6).toUpperCase()}</Text>
                </View>
                <View style={styles.confirmMetaRow}>
                  <Text style={styles.confirmMetaLabel}>{selectedJobAction.job.isBundledDelivery ? "Pickups" : "Restaurant"}</Text>
                  <Text style={styles.confirmMetaValue}>
                    {selectedJobAction.job.isBundledDelivery
                      ? `${selectedJobAction.job.pickupStops?.length || selectedJobAction.job.deliveryBundleSize || 2} restaurants`
                      : selectedJobAction.job.partnerId?.restaurantName || selectedJobAction.job.partnerId?.shopName || "Restaurant"}
                  </Text>
                </View>
                <View style={styles.confirmMetaRow}>
                  <Text style={styles.confirmMetaLabel}>Earnings</Text>
                  <Text style={[styles.confirmMetaValue, { color: "#087443", fontWeight: "800" }]}>
                    Rs {getOrderRiderEarnings(selectedJobAction.job)}
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setSelectedJobAction(null)} disabled={Boolean(acceptingJobId)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDone, selectedJobAction?.action === "reject" && styles.confirmDoneDanger]}
                onPress={confirmSelectedJobAction}
                disabled={Boolean(acceptingJobId)}
              >
                {acceptingJobId ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDoneText}>
                    {selectedJobAction?.action === "accept" ? "Accept" : "Reject"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA"
  },
  header: {
    backgroundColor: GREEN_PRIMARY,
    paddingHorizontal: 16,
    paddingBottom: 0
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
  greeting: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 2
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32
  },
  titleCompact: {
    fontSize: 22,
    lineHeight: 28
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 4
  },
  statItem: {
    flex: 1,
    alignItems: "center"
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.25)"
  },
  availabilityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1
  },
  availabilityCardOnline: {
    backgroundColor: "#ECFDF3",
    borderColor: "#ABEFC6"
  },
  availabilityCardOffline: {
    backgroundColor: "#F2F4F7",
    borderColor: "#E4E7EC"
  },
  availabilityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#98A2B3"
  },
  availabilityDotOnline: {
    backgroundColor: GREEN_DARK
  },
  availabilityTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1D2939"
  },
  availabilityTitleOffline: {
    color: "#475467"
  },
  availabilitySub: {
    fontSize: 12,
    color: "#667085",
    marginTop: 2
  },
  availabilityToggle: {
    padding: 6,
    borderRadius: 12
  },
  availabilityToggleOnline: {
    backgroundColor: GREEN_DARK
  },
  availabilityToggleOffline: {
    backgroundColor: "#E4E7EC"
  },
  availabilityToggleText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#98A2B3",
    letterSpacing: 1
  },
  availabilityToggleTextOnline: {
    color: "#FFFFFF"
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FEF3F2",
    borderWidth: 1,
    borderColor: "#FECDCA"
  },
  locationBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B42318"
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 14
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ECECEC"
  },
  skeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  skeletonBlock: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#F2F4F7"
  },
  skeletonMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F2F4F7"
  },
  jobCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ECECEC"
  },
  jobTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14
  },
  jobTopLeft: {
    flex: 1,
    minWidth: 0
  },
  orderId: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1D2939"
  },
  timeText: {
    fontSize: 12,
    color: "#98A2B3",
    marginTop: 3
  },
  jobEarningsBadge: {
    backgroundColor: GREEN_SOFT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center"
  },
  jobEarningsValue: {
    fontSize: 16,
    fontWeight: "800",
    color: GREEN_DEEP
  },
  jobEarningsLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: GREEN_DEEP,
    marginTop: 1
  },
  routeSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12
  },
  routeStop: {
    alignItems: "center",
    width: 20
  },
  routePinStore: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: "#2E7D32"
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#D0D5DD",
    marginVertical: 4
  },
  routePinHome: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1565C0",
    borderWidth: 2,
    borderColor: "#E0F2FE"
  },
  routeInfo: {
    flex: 1,
    justifyContent: "space-between",
    gap: 8
  },
  routeInfoBlock: {
    flex: 1,
    justifyContent: "center"
  },
  routeName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1D2939"
  },
  routeAddress: {
    fontSize: 12,
    color: "#667085",
    marginTop: 2
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingHorizontal: 8
  },
  metricItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5
  },
  metricDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#E5E7EB"
  },
  metricText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#667085"
  },
  jobFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2F4F7"
  },
  jobFooterLeft: {
    flex: 1
  },
  jobFooterTotal: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1D2939"
  },
  jobFooterTotalLabel: {
    fontSize: 11,
    color: "#98A2B3",
    marginTop: 1
  },
  jobFooterActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  rejectBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3F2",
    borderWidth: 1,
    borderColor: "#FECDCA"
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#4CAF50"
  },
  acceptBtnBusy: {
    opacity: 0.75
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF"
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
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1D2939",
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: "#667085",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20
  },
  emptyRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: GREEN_PRIMARY
  },
  emptyRefreshText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  listContent: {
    paddingBottom: 24
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  confirmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center"
  },
  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14
  },
  confirmIconWrapDanger: {
    backgroundColor: "#FEF3F2"
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1D2939",
    textAlign: "center"
  },
  confirmText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#667085",
    textAlign: "center"
  },
  confirmMeta: {
    marginTop: 16,
    width: "100%",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    gap: 8
  },
  confirmMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  confirmMetaLabel: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "600"
  },
  confirmMetaValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D2939"
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    width: "100%"
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#F2F4F7"
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475467"
  },
  confirmDone: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#4CAF50"
  },
  confirmDoneDanger: {
    backgroundColor: "#B42318"
  },
  confirmDoneText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF"
  }
});
