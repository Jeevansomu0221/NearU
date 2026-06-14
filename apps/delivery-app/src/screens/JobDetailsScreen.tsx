import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform
} from "react-native";
import { 
  acceptJob,
  getJobDetails, 
  markAsPickedUp, 
  markAsDelivered,
  DeliveryOrder 
} from "../api/delivery.api";
import { Ionicons } from "@expo/vector-icons";
import { buildMapsSearchUrl, formatAddress, getAddressGoogleMapsLink, type AddressLike } from "../utils/address";
import { getCurrentRiderLocation } from "../utils/riderLocation";

interface Props {
  route: any;
  navigation: any;
}

type CoordinateValue = number | string | null | undefined;

type MapLocation = {
  coordinates?:
    | [CoordinateValue, CoordinateValue]
    | {
        latitude?: CoordinateValue;
        longitude?: CoordinateValue;
        lat?: CoordinateValue;
        lng?: CoordinateValue;
        lon?: CoordinateValue;
      };
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  lat?: CoordinateValue;
  lng?: CoordinateValue;
  lon?: CoordinateValue;
};

type MapTarget = {
  address?: AddressLike;
  googleMapsLink?: string;
  location?: MapLocation;
  requireCoordinates?: boolean;
  destinationLabel?: string;
  contactPhone?: string;
};

type NoLocationModalState = {
  address?: AddressLike;
  contactPhone?: string;
  destinationLabel?: string;
};

export default function JobDetailsScreen({ route, navigation }: Props) {
  const { orderId, job: initialJob } = route.params;
  const [job, setJob] = useState<DeliveryOrder | null>(initialJob || null);
  const [loading, setLoading] = useState(!initialJob);
  const [updating, setUpdating] = useState(false);
  const [cashConfirmVisible, setCashConfirmVisible] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    onAction: () => void;
  } | null>(null);
  const [noLocationModal, setNoLocationModal] = useState<NoLocationModalState | null>(null);

  useEffect(() => {
    loadJobDetails();
    getCurrentRiderLocation({ showDeniedAlert: false }).catch(() => {});
  }, []);

  const returnToJobs = () => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: "Main", params: { screen: "Jobs" } }],
    });
  };

  const handleDetailsLoadFailure = (message: string) => {
    if (initialJob) {
      return;
    }

    Alert.alert("Error", message);
    returnToJobs();
  };

  const loadJobDetails = async () => {
    try {
      if (!initialJob) {
        setLoading(true);
      }
      const response = await getJobDetails(orderId);
      if (response.success && response.data) {
        setJob(response.data);
      } else {
        handleDetailsLoadFailure(response.message || "Failed to load job details");
      }
    } catch (error) {
      console.error("Error loading job details:", error);
      handleDetailsLoadFailure("Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const toCoordinateNumber = (value: CoordinateValue) => {
    if (value === null || value === undefined || value === "") return null;

    const parsed = typeof value === "string" ? Number(value.trim()) : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getLatLngFromPoint = (location?: MapLocation) => {
    if (!location) return null;

    const coordinateArray = Array.isArray(location.coordinates) ? location.coordinates : null;
    const coordinateObject = !Array.isArray(location.coordinates) ? location.coordinates : null;
    const latitude = toCoordinateNumber(
      location.latitude ?? location.lat ?? coordinateObject?.latitude ?? coordinateObject?.lat ?? coordinateArray?.[1]
    );
    const longitude = toCoordinateNumber(
      location.longitude ?? location.lng ?? location.lon ?? coordinateObject?.longitude ?? coordinateObject?.lng ?? coordinateObject?.lon ?? coordinateArray?.[0]
    );

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      (latitude === 0 && longitude === 0)
    ) {
      return null;
    }

    return { latitude, longitude };
  };

  const getLatLngFromMapsLink = (mapsLink?: string) => {
    if (!mapsLink) return null;

    let decodedLink = mapsLink;
    try {
      decodedLink = decodeURIComponent(mapsLink);
    } catch {
      decodedLink = mapsLink;
    }
    const coordinatePatterns = [
      /(?:destination|query|q)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
      /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
      /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i
    ];

    for (const pattern of coordinatePatterns) {
      const match = decodedLink.match(pattern);
      const latitude = toCoordinateNumber(match?.[1]);
      const longitude = toCoordinateNumber(match?.[2]);

      if (
        typeof latitude === "number" &&
        typeof longitude === "number" &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180 &&
        !(latitude === 0 && longitude === 0)
      ) {
        return { latitude, longitude };
      }
    }

    return null;
  };

  const openCoordinateDirections = async (
    latitude: number,
    longitude: number,
    label?: string
  ) => {
    const coordinateText = `${latitude},${longitude}`;
    const trimmedLabel = label?.trim();
    // Sanitize the label so it never breaks the URL. Google Maps shows it on
    // the pin so the rider knows whose drop this is.
    const safeLabel = trimmedLabel ? trimmedLabel.replace(/[()]/g, "") : undefined;
    const encodedLabel = safeLabel ? encodeURIComponent(safeLabel) : undefined;
    const nativeUrl = Platform.select({
      // google.navigation gives instant turn-by-turn directions on Android.
      android: `google.navigation:q=${coordinateText}&mode=d`,
      ios: `comgooglemaps://?daddr=${coordinateText}&directionsmode=driving`
    });
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinateText)}&travelmode=driving${encodedLabel ? `&query=${encodedLabel}` : ""}`;

    if (nativeUrl) {
      try {
        const canOpenNative = await Linking.canOpenURL(nativeUrl);
        if (canOpenNative) {
          await Linking.openURL(nativeUrl);
          return;
        }
      } catch {
        // Fall back to the universal Maps URL below.
      }
    }

    await Linking.openURL(webUrl);
  };

  const handleOpenMaps = async ({
    address,
    googleMapsLink,
    location,
    requireCoordinates,
    destinationLabel,
    contactPhone
  }: MapTarget) => {
    const coordinates = getLatLngFromPoint(location);

    if (coordinates) {
      await openCoordinateDirections(coordinates.latitude, coordinates.longitude, destinationLabel);
      return;
    }

    const linkCoordinates = getLatLngFromMapsLink(googleMapsLink);
    if (linkCoordinates) {
      await openCoordinateDirections(linkCoordinates.latitude, linkCoordinates.longitude, destinationLabel);
      return;
    }

    if (requireCoordinates) {
      try {
        const latestResponse = await getJobDetails(orderId);
        const latestJob = latestResponse.success ? latestResponse.data : null;
        const latestCoordinates =
          getLatLngFromPoint(latestJob?.deliveryLocation) ||
          getLatLngFromMapsLink(latestJob?.deliveryGoogleMapsLink);

        if (latestJob) {
          setJob(latestJob);
        }

        if (latestCoordinates) {
          await openCoordinateDirections(
            latestCoordinates.latitude,
            latestCoordinates.longitude,
            latestJob?.customerId?.name || destinationLabel
          );
          return;
        }
      } catch {
        // Continue to the fallback modal below.
      }

      // Pincode-only / text-only links from Google Maps drop the rider far
      // from the real door. Open a helpful chooser instead of a dead alert.
      setNoLocationModal({ address, contactPhone, destinationLabel });
      return;
    }

    const savedMapsLink = googleMapsLink || getAddressGoogleMapsLink(address);
    if (savedMapsLink) {
      await Linking.openURL(savedMapsLink);
      return;
    }

    const destination = formatAddress(address);
    if (destination !== "Address not available") {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
      await Linking.openURL(url);
      return;
    }

    Alert.alert("Location unavailable", "No map location is available for this stop.");
  };

  const openMapsSearchFallback = async (address?: AddressLike) => {
    const searchUrl = buildMapsSearchUrl(address);
    if (!searchUrl) {
      Alert.alert(
        "Search not possible",
        "We do not have enough address text to search Google Maps. Please call the customer for directions."
      );
      return;
    }
    try {
      await Linking.openURL(searchUrl);
    } catch {
      Alert.alert("Could not open Google Maps", "Please try again or call the customer.");
    }
  };

  const handleAcceptDelivery = async () => {
    try {
      setUpdating(true);
      const response = await acceptJob(orderId);

      if (response.success) {
        setJob((current) => response.data || (current ? { ...current, status: "ASSIGNED" } : null));
        setStatusModal({
          title: "Delivery accepted",
          message: "You can now head to the restaurant and mark the order picked up once collected.",
          actionLabel: "Start Pickup",
          onAction: () => {
            setStatusModal(null);
          }
        });
      } else {
        Alert.alert("Could not accept delivery", response.message || "Please try again.");
      }
    } catch (error) {
      console.error("Error accepting delivery:", error);
      Alert.alert("Could not accept delivery", "Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handlePickUp = async () => {
    try {
      setUpdating(true);

      const location = await getCurrentRiderLocation({ required: true, showDeniedAlert: true });
      if (!location) {
        return;
      }

      const response = await markAsPickedUp(
        orderId,
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
      );

      if (response.success) {
        setJob((current) => current ? { ...current, status: "PICKED_UP" } : response.data || null);
        setStatusModal({
          title: "Order picked up",
          message: "Nice work. Stay on this screen and complete delivery after handoff.",
          actionLabel: "Continue Delivery",
          onAction: () => {
            setStatusModal(null);
          }
        });
      } else {
        Alert.alert("Error", response.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error marking as picked up:", error);
      Alert.alert("Error", "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeliver = async () => {
    if (job?.paymentMethod === "CASH_ON_DELIVERY") {
      setCashConfirmVisible(true);
    } else {
      // For pre-paid orders, just confirm delivery
      await confirmDelivery();
    }
  };

  const confirmDelivery = async (collectedAmount?: number) => {
    try {
      setUpdating(true);

      const location = await getCurrentRiderLocation({ required: true, showDeniedAlert: true });
      if (!location) {
        return;
      }

      const response = await markAsDelivered(
        orderId,
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        },
        collectedAmount
      );

      if (response.success) {
        const earnedAmount = response.data?.deliveryEarnings || response.data?.deliveryFee || job?.deliveryFee || 49;
        const collectedText = collectedAmount
          ? ` Cash collected: Rs ${collectedAmount}.`
          : "";

        setStatusModal({
          title: "Delivery complete",
          message: `Successfully completed 1 delivery.${collectedText} Amount added to earnings: Rs ${earnedAmount}.`,
          actionLabel: "Back to Jobs",
          onAction: () => {
            setStatusModal(null);
            navigation.reset({
              index: 0,
              routes: [{ name: "Main", params: { screen: "Jobs" } }],
            });
          }
        });
      } else {
        Alert.alert("Error", response.message || "Failed to complete delivery");
      }
    } catch (error) {
      console.error("Error marking as delivered:", error);
      Alert.alert("Error", "Failed to complete delivery");
    } finally {
      setUpdating(false);
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
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return null;
  }

  const pickupStops = job.pickupStops?.length
    ? job.pickupStops
    : [{ partnerId: job.partnerId, orderId: job._id, sequence: 1, status: job.status, items: job.items, itemTotal: job.itemTotal, deliveryFee: job.deliveryFee, grandTotal: job.grandTotal }];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>
            {job.isBundledDelivery ? "Bundled Delivery" : `Order #${job._id.slice(-6).toUpperCase()}`}
          </Text>
          <View style={[
            styles.statusBadge,
            job.status === "ASSIGNED" && styles.statusAssigned,
            job.status === "PICKED_UP" && styles.statusPickedUp,
          ]}>
            <Text style={styles.statusText}>
              {job.status.replace("_", " ")}
            </Text>
          </View>
        </View>
        <Text style={styles.orderTime}>
          {formatDate(job.createdAt)} • {formatTime(job.createdAt)}
        </Text>
      </View>

      {/* Pickup Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="restaurant" size={20} color="#2E7D32" />
          <Text style={styles.sectionTitle}>
            {pickupStops.length > 1 ? `Pickup from ${pickupStops.length} Restaurants` : "Pickup from Restaurant"}
          </Text>
        </View>
        {pickupStops.map((stop, index) => (
          <View key={stop.orderId || `${job._id}-${index}`} style={styles.infoCard}>
            <Text style={styles.restaurantName}>
              Pickup {pickupStops.length > 1 ? index + 1 : ""} {stop.partnerId?.restaurantName || stop.partnerId?.shopName || "Restaurant"}
            </Text>
            <Text style={styles.addressText}>
              📍 {formatAddress(stop.partnerId?.address)}
            </Text>
            {stop.partnerId?.phone && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleCall(stop.partnerId!.phone)}
              >
                <Ionicons name="call" size={16} color="#4CAF50" />
                <Text style={styles.contactButtonText}>
                  Call Restaurant: {stop.partnerId.phone}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() =>
                handleOpenMaps({
                  address: stop.partnerId?.address,
                  googleMapsLink: stop.partnerId?.googleMapsLink || getAddressGoogleMapsLink(stop.partnerId?.address),
                  location: stop.partnerId?.location,
                  destinationLabel: stop.partnerId?.restaurantName || stop.partnerId?.shopName,
                  contactPhone: stop.partnerId?.phone
                })
              }
            >
              <Ionicons name="navigate" size={16} color="#1976D2" />
              <Text style={styles.mapButtonText}>Directions in Google Maps</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Delivery Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="home" size={20} color="#1976D2" />
          <Text style={styles.sectionTitle}>Deliver to Customer</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.customerName}>
            👤 {job.customerId?.name || "Customer"}
          </Text>
          <Text style={styles.addressText}>
            📍 {job.deliveryAddress}
          </Text>
          {job.customerId?.phone && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleCall(job.customerId!.phone)}
            >
              <Ionicons name="call" size={16} color="#4CAF50" />
              <Text style={styles.contactButtonText}>
                Call Customer: {job.customerId.phone}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() =>
              handleOpenMaps({
                address: job.deliveryAddress,
                googleMapsLink: job.deliveryGoogleMapsLink,
                location: job.deliveryLocation,
                requireCoordinates: true,
                destinationLabel: job.customerId?.name || "Customer",
                contactPhone: job.customerId?.phone
              })
            }
          >
            <Ionicons name="navigate" size={16} color="#1976D2" />
            <Text style={styles.mapButtonText}>Directions in Google Maps</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="receipt" size={20} color="#FF9800" />
          <Text style={styles.sectionTitle}>Order Details</Text>
        </View>
        <View style={styles.orderDetailsCard}>
          {job.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {(item as any).shopName ? `${(item as any).shopName}: ` : ""}{item.name}
              </Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
              </View>
            </View>
          ))}
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Item Total</Text>
            <Text style={styles.totalValue}>₹{job.itemTotal}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery Fee</Text>
            <Text style={styles.totalValue}>₹{job.deliveryFee}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Amount</Text>
            <Text style={styles.grandTotalValue}>₹{job.grandTotal}</Text>
          </View>
          
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method:</Text>
            <Text style={[
              styles.paymentValue,
              job.paymentMethod === "CASH_ON_DELIVERY" ? styles.codText : styles.paidText
            ]}>
              {job.paymentMethod === "CASH_ON_DELIVERY" ? "💰 Cash on Delivery" : "✅ Online Paid"}
            </Text>
          </View>
          
          {job.paymentMethod === "CASH_ON_DELIVERY" && (
            <View style={styles.amountCard}>
              <Ionicons name="cash" size={24} color="#4CAF50" />
              <Text style={styles.amountText}>
                Collect ₹{job.grandTotal} on delivery
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Customer Note */}
      {job.note && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Customer Note</Text>
          </View>
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>{job.note}</Text>
          </View>
        </View>
      )}

      {/* Earnings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cash" size={20} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Your Earnings</Text>
        </View>
        <View style={styles.earningsCard}>
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>Delivery Fee</Text>
            <Text style={styles.earningValue}>₹{job.deliveryFee}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalEarningRow}>
            <Text style={styles.totalEarningLabel}>You'll Earn</Text>
            <Text style={styles.totalEarningValue}>₹{job.deliveryFee}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {job.status === "READY" && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAcceptDelivery}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Accept Delivery</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.actionHint}>
            Accept this job from here and continue straight to pickup
          </Text>
        </View>
      )}

      {job.status === "ASSIGNED" && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePickUp}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {job.isBundledDelivery ? "All Pickups Completed" : "Mark as Picked Up"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.actionHint}>
            {job.isBundledDelivery
              ? "Use this after collecting orders from every restaurant listed above"
              : "Click this when you've collected the order from the restaurant"}
          </Text>
        </View>
      )}

      {job.status === "PICKED_UP" && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deliverButton]}
            onPress={handleDeliver}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {job.paymentMethod === "CASH_ON_DELIVERY" 
                    ? "Collect Cash & Mark Delivered" 
                    : "Mark as Delivered"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.actionHint}>
            {job.paymentMethod === "CASH_ON_DELIVERY"
              ? `Collect ₹${job.grandTotal} from customer before marking as delivered`
              : "Click after delivering to the customer"}
          </Text>
        </View>
      )}

      <View style={styles.spacer} />

      <Modal visible={cashConfirmVisible} transparent animationType="fade" onRequestClose={() => setCashConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="cash-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.confirmTitle}>Collect cash first</Text>
            <Text style={styles.confirmText}>Collect Rs {job.grandTotal} from the customer before completing this delivery.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmSecondary} onPress={() => setCashConfirmVisible(false)} disabled={updating}>
                <Text style={styles.confirmSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmPrimary}
                onPress={() => {
                  setCashConfirmVisible(false);
                  confirmDelivery(job.grandTotal);
                }}
                disabled={updating}
              >
                {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmPrimaryText}>Collected</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(statusModal)} transparent animationType="fade" onRequestClose={() => setStatusModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="checkmark-done-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.confirmTitle}>{statusModal?.title}</Text>
            <Text style={styles.confirmText}>{statusModal?.message}</Text>
            <TouchableOpacity style={[styles.confirmPrimary, styles.confirmSingleAction]} onPress={statusModal?.onAction}>
              <Text style={styles.confirmPrimaryText}>{statusModal?.actionLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(noLocationModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setNoLocationModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIcon, styles.confirmIconWarn]}>
              <Ionicons name="navigate-circle-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.confirmTitle}>Location pin unavailable</Text>
            <Text style={styles.confirmText}>
              We could not load an exact GPS pin for this order. A text or pincode-only Google Maps link can land you in
              the wrong area, so use one of these options instead.
            </Text>

            <View style={styles.noLocationAddressCard}>
              <Text style={styles.noLocationAddressLabel}>Saved address</Text>
              <Text style={styles.noLocationAddressText}>{formatAddress(noLocationModal?.address)}</Text>
            </View>

            <View style={styles.noLocationActions}>
              {noLocationModal?.contactPhone ? (
                <TouchableOpacity
                  style={[styles.confirmPrimary, styles.noLocationActionButton]}
                  onPress={() => {
                    const phone = noLocationModal?.contactPhone;
                    setNoLocationModal(null);
                    if (phone) handleCall(phone);
                  }}
                >
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                  <Text style={[styles.confirmPrimaryText, styles.noLocationActionText]}>
                    Call for directions
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.confirmSecondary, styles.noLocationActionButton]}
                onPress={() => {
                  const address = noLocationModal?.address;
                  setNoLocationModal(null);
                  openMapsSearchFallback(address);
                }}
              >
                <Ionicons name="search" size={16} color="#475467" />
                <Text style={[styles.confirmSecondaryText, styles.noLocationActionText]}>
                  Search address in Google Maps
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.noLocationDismiss}
                onPress={() => setNoLocationModal(null)}
              >
                <Text style={styles.noLocationDismissText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  statusAssigned: {
    backgroundColor: '#2196F3',
  },
  statusPickedUp: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderTime: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapButtonText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
    fontWeight: '500',
  },
  orderDetailsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginRight: 16,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  codText: {
    color: '#FF9800',
  },
  paidText: {
    color: '#4CAF50',
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 12,
  },
  noteCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  earningsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  earningLabel: {
    fontSize: 14,
    color: '#666',
  },
  earningValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalEarningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  totalEarningLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  totalEarningValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  actionSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deliverButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  spacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "center",
    paddingHorizontal: 22
  },
  confirmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DFF3E3"
  },
  confirmIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    marginBottom: 14
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center"
  },
  confirmText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#667085",
    textAlign: "center"
  },
  confirmActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 20
  },
  confirmSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
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
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#4CAF50"
  },
  confirmSingleAction: {
    width: "100%",
    marginTop: 20,
    flex: 0
  },
  confirmPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  confirmIconWarn: {
    backgroundColor: "#F4A100"
  },
  noLocationAddressCard: {
    width: "100%",
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  noLocationAddressLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475467",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4
  },
  noLocationAddressText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#1F2937"
  },
  noLocationActions: {
    width: "100%",
    marginTop: 18,
    gap: 10
  },
  noLocationActionButton: {
    flex: 0,
    width: "100%",
    flexDirection: "row",
    gap: 8
  },
  noLocationActionText: {
    marginLeft: 4
  },
  noLocationDismiss: {
    paddingVertical: 8,
    alignItems: "center"
  },
  noLocationDismissText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#667085"
  }
});