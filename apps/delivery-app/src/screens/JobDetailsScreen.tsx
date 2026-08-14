import React, { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from "react";
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
  Platform,
  Image,
  Dimensions,
  Animated,
  AppState,
  TextInput
} from "react-native";
import { 
  acceptJob,
  getJobDetails, 
  markAsPickedUp,
  markAsReachedCustomer,
  markAsDelivered,
  createCodUpiCollection,
  getCodUpiPaymentStatus,
  confirmCodUpiPayment,
  calculateDistance,
  DeliveryOrder,
  DeliveryJob,
  type CodUpiSession
} from "../api/delivery.api";
import { Ionicons } from "@expo/vector-icons";
import DeliveryJobMap from "../components/DeliveryJobMap";
import SwipeConfirm from "../components/SwipeConfirm";
import type { MapPin } from "../utils/mapCoordinates";
import { buildMapsSearchUrl, formatAddress, getAddressGoogleMapsLink, type AddressLike } from "../utils/address";
import {
  getLatLngFromMapsLink,
  getLatLngFromPoint,
  resolveLatLng,
  type LatLng,
  type MapLocation
} from "../utils/mapCoordinates";
import { getCurrentRiderLocation, useRiderLiveLocation } from "../utils/riderLocation";
import { getRiderReadyByMessage } from "../utils/prepTime";
import { getOrderRiderEarnings } from "../utils/riderEarnings";
import { getImagePicker } from "../utils/imagePicker";
import { uploadMultipart } from "../api/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  route: any;
  navigation: any;
}

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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const UPI_FOCUS_SIZE = SCREEN_WIDTH - 40;
const UPI_NATIVE_QR_SIZE = UPI_FOCUS_SIZE - 12;
// Razorpay poster proportions: width ≈ 63% of height (630×1008 px)
// QR code block sits at ~23-62% vertically, ~6-94% horizontally in the poster
const RZPAY_IMG_W = UPI_FOCUS_SIZE * 1.25;
const RZPAY_IMG_H = RZPAY_IMG_W * 1.61;
const RZPAY_IMG_LEFT = -((RZPAY_IMG_W - UPI_FOCUS_SIZE) / 2);
const RZPAY_IMG_TOP = -(RZPAY_IMG_H * 0.22);

const getJobRiderEarnings = getOrderRiderEarnings;

const formatKm = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)} km` : "--";

const getCodQrDisplayUri = (session: CodUpiSession | null) => {
  if (!session) return null;
  if (session.provider === "razorpay_qr" && session.qrImageUrl) {
    return session.qrImageUrl;
  }
  // Prefer native UPI QR (opens PhonePe/GPay directly).
  if (session.qrDataUrl) {
    return session.qrDataUrl;
  }
  return null;
};

const isRazorpayPosterQr = (session: CodUpiSession | null) => session?.provider === "razorpay_qr";

export default function JobDetailsScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { orderId, job: initialJob } = route.params;
  const [job, setJob] = useState<DeliveryJob | null>(initialJob || null);
  const [loading, setLoading] = useState(!initialJob);
  const [updating, setUpdating] = useState(false);
  const [cashConfirmVisible, setCashConfirmVisible] = useState(false);
  const [codPaymentChoiceVisible, setCodPaymentChoiceVisible] = useState(false);
  const [upiPaymentVisible, setUpiPaymentVisible] = useState(false);
  const [codUpiSession, setCodUpiSession] = useState<CodUpiSession | null>(null);
  const [otpConfirmVisible, setOtpConfirmVisible] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState("");
  const [otpBypassMode, setOtpBypassMode] = useState(false);
  const [bypassProofUrl, setBypassProofUrl] = useState("");
  const [uploadingBypassProof, setUploadingBypassProof] = useState(false);
  const [pendingDelivery, setPendingDelivery] = useState<{
    collectedAmount?: number;
    collectionMethod: "CASH" | "UPI";
  } | null>(null);
  const [upiPaymentPaid, setUpiPaymentPaid] = useState(false);
  const [upiLoading, setUpiLoading] = useState(false);
  const [upiPolling, setUpiPolling] = useState(false);
  const [upiAwaitingPayment, setUpiAwaitingPayment] = useState(false);
  const pollInFlightRef = useRef(false);
  const [statusModal, setStatusModal] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    onAction: () => void;
  } | null>(null);
  const [noLocationModal, setNoLocationModal] = useState<NoLocationModalState | null>(null);
  const riderLocation = useRiderLiveLocation();
  /** Local step confirmations before calling pickup/delivery APIs. */
  const [reachedPickup, setReachedPickup] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [mapAreaHeight, setMapAreaHeight] = useState(280);
  const codQrDisplayUri = useMemo(() => getCodQrDisplayUri(codUpiSession), [codUpiSession]);
  const showRazorpayPoster = isRazorpayPosterQr(codUpiSession);
  const qrPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!upiPaymentVisible) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(qrPulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(qrPulse, { toValue: 0, duration: 1400, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [upiPaymentVisible, qrPulse]);

  const qrRingScale = qrPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const qrRingOpacity = qrPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.85] });

  useEffect(() => {
    loadJobDetails();
  }, []);

  useLayoutEffect(() => {
    if (!job) return;

    let title = "Job Details";
    if (job.status === "ASSIGNED") {
      title = reachedPickup ? "Mark picked up" : "Go to pickup";
    } else if (job.status === "PICKED_UP") {
      title = "Go to customer";
    } else if (job.status === "REACHED_CUSTOMER") {
      title = "Deliver order";
    }

    navigation.setOptions({ title });
  }, [job?.status, reachedPickup, navigation]);

  useEffect(() => {
    if (!job?.status) return;
    if (job.status !== "ASSIGNED") {
      setReachedPickup(false);
    }
  }, [job?.status]);

  const refreshUpiPaymentStatus = useCallback(async () => {
    if (pollInFlightRef.current) {
      return false;
    }

    try {
      pollInFlightRef.current = true;
      setUpiPolling(true);
      const response = await getCodUpiPaymentStatus(orderId, codUpiSession);
      if (response.success && response.data) {
        if (response.data.manualConfirmRequired) {
          setCodUpiSession((previous) =>
            previous ? { ...previous, manualConfirmRequired: true } : previous
          );
          setUpiAwaitingPayment(false);
        }

        if (response.data.paid) {
          setUpiPaymentPaid(true);
          setUpiAwaitingPayment(false);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Failed to poll COD UPI status:", error);
      return false;
    } finally {
      pollInFlightRef.current = false;
      setUpiPolling(false);
    }
  }, [orderId, codUpiSession]);

  useEffect(() => {
    if (!upiPaymentVisible) {
      setUpiAwaitingPayment(false);
    }
  }, [upiPaymentVisible]);

  useEffect(() => {
    if (
      !upiPaymentVisible ||
      !codUpiSession ||
      upiPaymentPaid ||
      codUpiSession.manualConfirmRequired
    ) {
      return;
    }

    let cancelled = false;
    const pollPaymentStatus = async () => {
      if (cancelled) return;
      await refreshUpiPaymentStatus();
    };

    pollPaymentStatus();
    const intervalId = setInterval(pollPaymentStatus, 2000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [
    upiPaymentVisible,
    codUpiSession,
    upiPaymentPaid,
    orderId,
    refreshUpiPaymentStatus,
  ]);

  useEffect(() => {
    if (
      !upiPaymentVisible ||
      !codUpiSession ||
      upiPaymentPaid ||
      codUpiSession.manualConfirmRequired
    ) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshUpiPaymentStatus();
      }
    });

    return () => subscription.remove();
  }, [upiPaymentVisible, codUpiSession, upiPaymentPaid, refreshUpiPaymentStatus]);

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

  const enrichJobWithDistances = async (jobData: DeliveryJob): Promise<DeliveryJob> => {
    const next: DeliveryJob = { ...jobData };
    const alreadyHasPickup =
      typeof next.distanceToRestaurant === "number" || typeof (next as any).distance === "number";
    const alreadyHasDrop =
      typeof next.distanceToCustomer === "number" || typeof next.estimatedDistance === "number";

    if (alreadyHasPickup && alreadyHasDrop) {
      return next;
    }

    try {
      const location = await getCurrentRiderLocation({ required: false, showDeniedAlert: false });
      if (!location) {
        return next;
      }

      const origin = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };

      if (!alreadyHasPickup) {
        const pickupCoords = resolveLatLng({
          location: next.partnerId?.location || next.pickupStops?.[0]?.partnerId?.location,
          googleMapsLink:
            next.partnerId?.googleMapsLink ||
            next.pickupStops?.[0]?.partnerId?.googleMapsLink ||
            getAddressGoogleMapsLink(next.partnerId?.address || next.pickupStops?.[0]?.partnerId?.address)
        });
        if (pickupCoords) {
          const response = await calculateDistance(origin, pickupCoords);
          if (response.success && typeof response.data?.distance === "number") {
            next.distanceToRestaurant = Number(response.data.distance.toFixed(1));
          }
        }
      }

      if (!alreadyHasDrop) {
        const dropCoords = resolveLatLng({
          location: next.deliveryLocation,
          googleMapsLink: next.deliveryGoogleMapsLink
        });
        if (dropCoords) {
          const response = await calculateDistance(origin, dropCoords);
          if (response.success && typeof response.data?.distance === "number") {
            next.distanceToCustomer = Number(response.data.distance.toFixed(1));
          }
        }
      }
    } catch (error) {
      console.log("Failed to calculate job distances:", error);
    }

    return next;
  };

  const loadJobDetails = async () => {
    try {
      if (!initialJob) {
        setLoading(true);
      }
      const response = await getJobDetails(orderId);
      if (response.success && response.data) {
        const merged: DeliveryJob = {
          ...response.data,
          // Keep distances from list/notification navigation when API omits them.
          distanceToRestaurant:
            response.data.distanceToRestaurant ?? initialJob?.distanceToRestaurant,
          distanceToCustomer:
            response.data.distanceToCustomer ?? initialJob?.distanceToCustomer,
          estimatedDistance: response.data.estimatedDistance ?? initialJob?.estimatedDistance,
          totalDistance: response.data.totalDistance ?? initialJob?.totalDistance
        };
        const enriched = await enrichJobWithDistances(merged);
        setJob(enriched);
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
    const liveOrigin = await getCurrentRiderLocation({
      required: false,
      showDeniedAlert: false,
      timeoutMs: 8000
    });
    const origin =
      liveOrigin?.coords
        ? `${liveOrigin.coords.latitude},${liveOrigin.coords.longitude}`
        : riderLocation
          ? `${riderLocation.latitude},${riderLocation.longitude}`
          : undefined;
    const originQuery = origin ? `&origin=${encodeURIComponent(origin)}` : "";
    const nativeUrl = Platform.select({
      android: origin
        ? `https://www.google.com/maps/dir/?api=1${originQuery}&destination=${encodeURIComponent(coordinateText)}&travelmode=driving`
        : `google.navigation:q=${coordinateText}&mode=d`,
      ios: origin
        ? `comgooglemaps://?saddr=${origin}&daddr=${coordinateText}&directionsmode=driving`
        : `comgooglemaps://?daddr=${coordinateText}&directionsmode=driving`
    });
    const webUrl = `https://www.google.com/maps/dir/?api=1${originQuery}&destination=${encodeURIComponent(coordinateText)}&travelmode=driving${encodedLabel ? `&query=${encodedLabel}` : ""}`;

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
      await getCurrentRiderLocation({ required: false, showDeniedAlert: true, timeoutMs: 8000 });
      const response = await acceptJob(orderId);

      if (response.success) {
        setJob((current) => response.data || (current ? { ...current, status: "ASSIGNED" } : null));
        setStatusModal({
          title: "Delivery accepted",
          message: "Head to the restaurant. Swipe when you reach pickup, then mark the order as picked up.",
          actionLabel: "Go to pickup",
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
        setReachedPickup(false);
        setStatusModal({
          title: "Order picked up",
          message: "Head to the customer. Swipe when you reach their location to notify them and complete delivery.",
          actionLabel: "Go to customer",
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

  const handleReachedCustomer = async () => {
    try {
      setUpdating(true);

      const location = await getCurrentRiderLocation({ required: true, showDeniedAlert: true });
      if (!location) {
        return;
      }

      const response = await markAsReachedCustomer(orderId, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (response.success) {
        setJob((current) =>
          current ? { ...current, status: "REACHED_CUSTOMER" } : response.data || null
        );
        setStatusModal({
          title: "Reached customer",
          message: "The customer has been notified. Collect the verification code and mark the order as delivered.",
          actionLabel: "Continue",
          onAction: () => {
            setStatusModal(null);
          }
        });
      } else {
        Alert.alert("Could not update status", response.message || "Failed to mark reached customer location");
      }
    } catch (error: any) {
      console.error("Error marking reached customer:", error);
      Alert.alert(
        "Could not update status",
        error?.message || "Failed to mark reached customer location"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDeliver = async () => {
    if (job?.paymentMethod === "CASH_ON_DELIVERY") {
      setCodPaymentChoiceVisible(true);
    } else {
      requestDeliveryVerification();
    }
  };

  const requestDeliveryVerification = (
    collectedAmount?: number,
    collectionMethod: "CASH" | "UPI" = "CASH"
  ) => {
    setPendingDelivery({ collectedAmount, collectionMethod });
    setDeliveryOtp("");
    setOtpBypassMode(false);
    setBypassProofUrl("");
    setOtpConfirmVisible(true);
  };

  const resetOtpModal = () => {
    setOtpConfirmVisible(false);
    setPendingDelivery(null);
    setDeliveryOtp("");
    setOtpBypassMode(false);
    setBypassProofUrl("");
  };

  const pickBypassProof = async (source: "camera" | "gallery") => {
    const ImagePicker = await getImagePicker();
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert(
        "Permission needed",
        source === "camera"
          ? "Allow camera access to take a delivery proof photo."
          : "Allow gallery access to upload a delivery proof photo."
      );
      return;
    }

    setOtpConfirmVisible(false);
    await new Promise((resolve) => setTimeout(resolve, Platform.OS === "android" ? 220 : 120));

    let result;
    try {
      result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
              allowsEditing: false
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
              allowsEditing: false
            });
    } catch (error: any) {
      setOtpConfirmVisible(true);
      Alert.alert("Upload failed", error?.message || "Could not open the camera or gallery.");
      return;
    }

    setOtpConfirmVisible(true);

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    try {
      setUploadingBypassProof(true);
      const asset = result.assets[0];
      const fileName = asset.fileName || `delivery-proof-${Date.now()}.jpg`;
      const formData = new FormData();
      // @ts-ignore React Native FormData file
      formData.append("image", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: fileName
      });
      const response = await uploadMultipart<{ url: string }>("/upload/image", formData);
      if (!response.success || !response.data?.url) {
        throw new Error(response.message || "Could not upload proof image");
      }
      setBypassProofUrl(response.data.url);
    } catch (error: any) {
      Alert.alert("Upload failed", error.message || "Could not upload delivery proof");
    } finally {
      setUploadingBypassProof(false);
    }
  };

  const startCashCollection = () => {
    setCodPaymentChoiceVisible(false);
    setCashConfirmVisible(true);
  };

  const startUpiCollection = async () => {
    try {
      setUpiLoading(true);
      const response = await createCodUpiCollection(orderId);
      if (!response.success || !response.data) {
        Alert.alert("UPI unavailable", response.message || "Could not create UPI payment QR. Try cash collection.");
        return;
      }
      if (response.data.paid) {
        setCodUpiSession(response.data);
        setUpiPaymentPaid(true);
        setUpiAwaitingPayment(false);
        setCodPaymentChoiceVisible(false);
        setUpiPaymentVisible(true);
        return;
      }
      if (!getCodQrDisplayUri(response.data)) {
        Alert.alert(
          "UPI unavailable",
          "Could not prepare a scannable UPI QR. Use cash collection or contact support."
        );
        return;
      }
      setCodUpiSession(response.data);
      setUpiPaymentPaid(false);
      setUpiAwaitingPayment(!response.data.manualConfirmRequired);
      setCodPaymentChoiceVisible(false);
      setUpiPaymentVisible(true);
    } catch (error) {
      console.error("Failed to start UPI collection:", error);
      Alert.alert("UPI unavailable", "Could not create UPI payment QR. Try cash collection.");
    } finally {
      setUpiLoading(false);
    }
  };

  const handleManualUpiConfirm = async (riderManualVerify = false) => {
    try {
      setUpiLoading(true);
      const response = await confirmCodUpiPayment(orderId, { riderManualVerify, session: codUpiSession });
      if (!response.success) {
        Alert.alert(
          "Payment not confirmed",
          response.message || "Ask the customer to complete payment, then try again."
        );
        return;
      }
      setUpiPaymentPaid(true);
      setUpiAwaitingPayment(false);
    } catch (error) {
      console.error("Failed to confirm UPI payment:", error);
      Alert.alert("Could not confirm", "Please try again in a few seconds.");
    } finally {
      setUpiLoading(false);
    }
  };

  const handleRiderManualVerify = () => {
    const amount = codUpiSession?.amount || job?.grandTotal || 0;
    Alert.alert(
      "Verify payment manually",
      `Confirm the customer paid Rs ${amount} via UPI. Only use this if you have verified the payment was received.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Payment verified",
          onPress: () => {
            void handleManualUpiConfirm(true);
          }
        }
      ]
    );
  };

  const completeUpiDelivery = async () => {
    setUpiPaymentVisible(false);
    requestDeliveryVerification(undefined, "UPI");
  };

  const submitDeliveryVerification = async () => {
    const code = deliveryOtp.trim();
    if (!/^\d{4}$/.test(code)) {
      Alert.alert("Invalid code", "Enter the 4-digit verification code from the customer.");
      return;
    }
    const pending = pendingDelivery || { collectionMethod: "CASH" as const };
    setOtpConfirmVisible(false);
    await confirmDelivery(pending.collectedAmount, pending.collectionMethod, code);
  };

  const submitOtpBypassDelivery = async () => {
    if (!bypassProofUrl.trim()) {
      Alert.alert("Proof required", "Take or upload a photo showing the order was delivered.");
      return;
    }
    const pending = pendingDelivery || { collectionMethod: "CASH" as const };
    setOtpConfirmVisible(false);
    await confirmDelivery(pending.collectedAmount, pending.collectionMethod, undefined, {
      proofUrl: bypassProofUrl.trim(),
      reason: "Customer could not provide verification code"
    });
  };

  const confirmDelivery = async (
    collectedAmount?: number,
    collectionMethod: "CASH" | "UPI" = "CASH",
    verificationCode?: string,
    otpBypass?: { proofUrl: string; reason?: string }
  ) => {
    try {
      setUpdating(true);

      const location = await getCurrentRiderLocation({ required: true, showDeniedAlert: true });
      if (!location) {
        setOtpConfirmVisible(true);
        return;
      }

      const response = await markAsDelivered(
        orderId,
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        },
        collectedAmount,
        collectionMethod,
        verificationCode,
        otpBypass
      );

      if (response.success) {
        resetOtpModal();
        const earnedAmount = response.data?.deliveryEarnings || getJobRiderEarnings(response.data || job);
        const collectedText = collectionMethod === "UPI"
          ? ` UPI payment of Rs ${job?.grandTotal || collectedAmount || 0} received by Vyaha.`
          : collectedAmount
            ? ` Cash collected: Rs ${collectedAmount}.`
            : "";
        const bypassText = otpBypass?.proofUrl
          ? " Delivery proof was sent to Vyaha support because the verification code was unavailable."
          : "";

        setStatusModal({
          title: "Delivery complete",
          message: `Successfully completed 1 delivery.${collectedText}${bypassText} Amount added to earnings: Rs ${earnedAmount}.`,
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
        Alert.alert("Verification failed", response.message || "Failed to complete delivery");
        setDeliveryOtp("");
        setPendingDelivery({ collectedAmount, collectionMethod });
        if (otpBypass?.proofUrl) {
          setOtpBypassMode(true);
          setBypassProofUrl(otpBypass.proofUrl);
        }
        setOtpConfirmVisible(true);
      }
    } catch (error) {
      console.error("Error marking as delivered:", error);
      Alert.alert("Error", "Failed to complete delivery");
      setPendingDelivery({ collectedAmount, collectionMethod });
      if (otpBypass?.proofUrl) {
        setOtpBypassMode(true);
        setBypassProofUrl(otpBypass.proofUrl);
      }
      setOtpConfirmVisible(true);
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

  const isPickupPhase = job.status === "READY" || job.status === "ASSIGNED";
  const activePickupStop = pickupStops.find((stop) => stop.status !== "PICKED_UP" && stop.status !== "DELIVERED") || pickupStops[0];
  const activePickupCoords = resolveLatLng({
    location: activePickupStop?.partnerId?.location,
    googleMapsLink:
      activePickupStop?.partnerId?.googleMapsLink ||
      getAddressGoogleMapsLink(activePickupStop?.partnerId?.address)
  });
  const deliveryCoords = resolveLatLng({
    location: job.deliveryLocation,
    googleMapsLink: job.deliveryGoogleMapsLink
  });
  const activeDestination = isPickupPhase ? activePickupCoords : deliveryCoords;
  const activeMapsTarget: MapTarget = isPickupPhase
    ? {
        address: activePickupStop?.partnerId?.address,
        googleMapsLink:
          activePickupStop?.partnerId?.googleMapsLink ||
          getAddressGoogleMapsLink(activePickupStop?.partnerId?.address),
        location: activePickupStop?.partnerId?.location,
        destinationLabel:
          activePickupStop?.partnerId?.restaurantName || activePickupStop?.partnerId?.shopName,
        contactPhone: activePickupStop?.partnerId?.phone
      }
    : {
        address: job.deliveryAddress,
        googleMapsLink: job.deliveryGoogleMapsLink,
        location: job.deliveryLocation,
        requireCoordinates: true,
        destinationLabel: job.customerId?.name || "Customer",
        contactPhone: job.customerId?.phone
      };

  const mapPins: MapPin[] = [];
  if (isPickupPhase) {
    pickupStops.forEach((stop, index) => {
      const coordinate = resolveLatLng({
        location: stop.partnerId?.location,
        googleMapsLink: stop.partnerId?.googleMapsLink || getAddressGoogleMapsLink(stop.partnerId?.address)
      });
      if (coordinate) {
        mapPins.push({
          id: `pickup-${stop.orderId || index}`,
          coordinate,
          title: stop.partnerId?.restaurantName || stop.partnerId?.shopName || `Pickup ${index + 1}`,
          kind: "pickup"
        });
      }
    });
  } else if (deliveryCoords) {
    mapPins.push({
      id: "drop",
      coordinate: deliveryCoords,
      title: job.customerId?.name || "Customer",
      kind: "drop"
    });
  }

  const stopName = isPickupPhase
    ? activePickupStop?.partnerId?.restaurantName ||
      activePickupStop?.partnerId?.shopName ||
      "Restaurant"
    : job.customerId?.name || "Customer";
  const stopAddress = isPickupPhase
    ? formatAddress(activePickupStop?.partnerId?.address)
    : job.deliveryAddress;
  const stopPhone = isPickupPhase ? activePickupStop?.partnerId?.phone : job.customerId?.phone;
  const isNavigatingToStop =
    job.status === "ASSIGNED" || job.status === "PICKED_UP";
  const showDeliveryDetails = job.status === "REACHED_CUSTOMER";
  const bottomPad = Math.max(insets.bottom, 12);
  const orderDisplayId = job.isBundledDelivery
    ? "Bundled"
    : `#${job._id.slice(-6).toUpperCase()}`;
  const readyByMessage = getRiderReadyByMessage(job.estimatedReadyAt, job.prepTimeMinutes);

  const renderOrderMetaLink = () => (
    <View style={styles.orderMetaRight}>
      <Text style={styles.orderMetaNumber}>{orderDisplayId}</Text>
      <TouchableOpacity
        onPress={() => setReceiptVisible(true)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Text style={styles.orderMetaLink}>Order details</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReceiptContent = () => (
    <>
      <View style={styles.receiptHeader}>
        <Text style={styles.receiptTitle}>
          {job.isBundledDelivery ? "Bundled Delivery" : `Order ${orderDisplayId}`}
        </Text>
        <Text style={styles.receiptTime}>
          {formatDate(job.createdAt)} • {formatTime(job.createdAt)}
        </Text>
      </View>

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
      {Number(job.tipAmount || 0) > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Customer Tip</Text>
          <Text style={styles.totalValue}>₹{job.tipAmount}</Text>
        </View>
      ) : null}
      <View style={styles.grandTotalRow}>
        <Text style={styles.grandTotalLabel}>Total Amount</Text>
        <Text style={styles.grandTotalValue}>₹{job.grandTotal}</Text>
      </View>

      <View style={styles.paymentRow}>
        <Text style={styles.paymentLabel}>Payment Method</Text>
        <Text style={[
          styles.paymentValue,
          job.paymentMethod === "CASH_ON_DELIVERY" ? styles.codText : styles.paidText
        ]}>
          {job.paymentMethod === "CASH_ON_DELIVERY" ? "Cash on Delivery" : "Online Paid"}
        </Text>
      </View>

      {job.paymentMethod === "CASH_ON_DELIVERY" ? (
        <View style={styles.amountCard}>
          <Ionicons name="cash" size={20} color="#4CAF50" />
          <Text style={styles.amountText}>Collect ₹{job.grandTotal} on delivery</Text>
        </View>
      ) : null}

      {job.note ? (
        <>
          <View style={[styles.divider, { marginTop: 16 }]} />
          <Text style={styles.receiptNoteLabel}>Delivery instructions</Text>
          <Text style={styles.receiptNoteText}>{job.note}</Text>
        </>
      ) : null}
    </>
  );

  const renderSwipeActions = () => {
    if (job.status === "READY") {
      return (
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
      );
    }

    if (job.status === "ASSIGNED" && !reachedPickup) {
      return (
        <SwipeConfirm
          actionLabel="Reached pickup location"
          accentColor="#22C55E"
          disabled={updating}
          loading={updating}
          onConfirm={async () => {
            setReachedPickup(true);
          }}
        />
      );
    }

    if (job.status === "ASSIGNED" && reachedPickup) {
      return (
        <SwipeConfirm
          actionLabel={
            job.isBundledDelivery ? "Mark as picked up (all)" : "Mark as picked up"
          }
          accentColor="#16A34A"
          disabled={updating}
          loading={updating}
          onConfirm={handlePickUp}
        />
      );
    }

    if (job.status === "PICKED_UP") {
      return (
        <SwipeConfirm
          actionLabel="Reached customer location"
          accentColor="#2563EB"
          disabled={updating}
          loading={updating}
          onConfirm={handleReachedCustomer}
        />
      );
    }

    if (job.status === "REACHED_CUSTOMER") {
      return (
        <SwipeConfirm
          actionLabel="Mark as order delivered"
          accentColor="#2563EB"
          disabled={updating}
          loading={updating}
          onConfirm={handleDeliver}
        />
      );
    }

    return null;
  };

  const renderStopSheet = () => (
    <View style={styles.stopSheet}>
      <View style={styles.stopSheetHandle} />
      <View style={styles.stopTopRow}>
        <View style={styles.stopBadge}>
          <Text style={styles.stopBadgeText}>
            {isPickupPhase
              ? reachedPickup
                ? "AT PICKUP"
                : "PICK UP"
              : "DROP OFF"}
          </Text>
        </View>
        {renderOrderMetaLink()}
      </View>
      <Text style={styles.stopName} numberOfLines={2}>{stopName}</Text>
      {isPickupPhase && readyByMessage ? (
        <View style={styles.readyByBanner}>
          <Ionicons name="time-outline" size={16} color="#1D4E89" />
          <Text style={styles.readyByText}>{readyByMessage}</Text>
        </View>
      ) : null}
      <Text style={styles.stopAddress} numberOfLines={3}>{stopAddress}</Text>
      <View style={styles.stopActions}>
        {stopPhone ? (
          <TouchableOpacity
            style={styles.stopActionOutline}
            onPress={() => handleCall(stopPhone)}
          >
            <Ionicons name="call" size={18} color="#2563EB" />
            <Text style={styles.stopActionOutlineText}>Call</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[
            styles.stopActionFilled,
            !stopPhone && styles.stopActionFilledFull
          ]}
          onPress={() => {
            void handleOpenMaps(activeMapsTarget);
          }}
        >
          <Ionicons name="navigate" size={18} color="#FFFFFF" />
          <Text style={styles.stopActionFilledText}>Map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDeliveryDetails = () => (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.deliverScrollContent, { paddingBottom: 88 + bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.deliverCard}>
        <View style={styles.deliverTopRow}>
          <View style={styles.stopBadge}>
            <Text style={styles.stopBadgeText}>DELIVER</Text>
          </View>
          {renderOrderMetaLink()}
        </View>

        <Text style={styles.deliverCustomerName}>{job.customerId?.name || "Customer"}</Text>
        <Text style={styles.deliverCustomerAddress}>{job.deliveryAddress}</Text>

        <View style={styles.deliverActionRow}>
          {job.customerId?.phone ? (
            <TouchableOpacity
              style={styles.deliverCallButton}
              onPress={() => handleCall(job.customerId!.phone!)}
            >
              <Ionicons name="call" size={16} color="#2563EB" />
              <Text style={styles.deliverCallText}>Call</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[
              styles.deliverMapButton,
              !job.customerId?.phone && styles.deliverMapButtonFull
            ]}
            onPress={() => {
              void handleOpenMaps(activeMapsTarget);
            }}
          >
            <Ionicons name="navigate" size={16} color="#FFFFFF" />
            <Text style={styles.deliverMapText}>Map</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.deliverDivider} />

        <View style={styles.deliverOrderMeta}>
          <Text style={styles.deliverOrderId}>
            {job.isBundledDelivery ? "Bundled Delivery" : `Order ${orderDisplayId}`}
          </Text>
          <Text style={styles.deliverOrderWhen}>
            {formatDate(job.createdAt)}  ·  {formatTime(job.createdAt)}
          </Text>
        </View>

        {job.items.map((item, index) => (
          <View
            key={index}
            style={[
              styles.deliverItemRow,
              index === job.items.length - 1 && styles.deliverItemRowLast
            ]}
          >
            <View style={styles.deliverItemLeft}>
              <Text style={styles.deliverItemName} numberOfLines={2}>
                {(item as any).shopName ? `${(item as any).shopName}: ` : ""}{item.name}
              </Text>
              <Text style={styles.deliverItemQty}>Qty {item.quantity}</Text>
            </View>
            <Text style={styles.deliverItemPrice}>₹{item.price * item.quantity}</Text>
          </View>
        ))}

        <View style={styles.deliverDivider} />

        <View style={styles.deliverTotalRow}>
          <Text style={styles.deliverTotalLabel}>Item total</Text>
          <Text style={styles.deliverTotalValue}>₹{job.itemTotal}</Text>
        </View>
        <View style={styles.deliverTotalRow}>
          <Text style={styles.deliverTotalLabel}>Delivery fee</Text>
          <Text style={styles.deliverTotalValue}>₹{job.deliveryFee}</Text>
        </View>
        {Number(job.tipAmount || 0) > 0 ? (
          <View style={styles.deliverTotalRow}>
            <Text style={styles.deliverTotalLabel}>Customer tip</Text>
            <Text style={styles.deliverTotalValue}>₹{job.tipAmount}</Text>
          </View>
        ) : null}
        <View style={styles.deliverGrandRow}>
          <Text style={styles.deliverGrandLabel}>Total</Text>
          <Text style={styles.deliverGrandValue}>₹{job.grandTotal}</Text>
        </View>

        <View style={styles.deliverPaymentRow}>
          <Text style={styles.deliverPaymentLabel}>Payment</Text>
          <View
            style={[
              styles.deliverPaymentPill,
              job.paymentMethod === "CASH_ON_DELIVERY"
                ? styles.deliverPaymentPillCod
                : styles.deliverPaymentPillPaid
            ]}
          >
            <Text
              style={[
                styles.deliverPaymentPillText,
                job.paymentMethod === "CASH_ON_DELIVERY"
                  ? styles.deliverPaymentPillTextCod
                  : styles.deliverPaymentPillTextPaid
              ]}
            >
              {job.paymentMethod === "CASH_ON_DELIVERY" ? "Cash on Delivery" : "Online Paid"}
            </Text>
          </View>
        </View>

        {job.paymentMethod === "CASH_ON_DELIVERY" ? (
          <View style={styles.deliverCollectBanner}>
            <Ionicons name="cash-outline" size={18} color="#166534" />
            <Text style={styles.deliverCollectText}>
              Collect ₹{job.grandTotal} from customer
            </Text>
          </View>
        ) : null}

        {job.note ? (
          <View style={styles.deliverNoteBox}>
            <Text style={styles.deliverNoteLabel}>Delivery instructions</Text>
            <Text style={styles.deliverNoteText}>{job.note}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.screen}>
      {isNavigatingToStop ? (
        <View style={styles.navigationBody}>
          <View
            style={styles.mapArea}
            onLayout={(event) => {
              const nextHeight = Math.floor(event.nativeEvent.layout.height);
              if (nextHeight > 0 && nextHeight !== mapAreaHeight) {
                setMapAreaHeight(nextHeight);
              }
            }}
          >
            <DeliveryJobMap
              height={mapAreaHeight}
              riderLocation={riderLocation}
              destination={activeDestination}
              pins={mapPins}
              onOpenExternalMaps={() => {
                void handleOpenMaps(activeMapsTarget);
              }}
            />
          </View>
          <View style={[styles.bottomDock, { paddingBottom: bottomPad }]}>
            {renderStopSheet()}
            <View style={styles.dockSwipeWrap}>{renderSwipeActions()}</View>
          </View>
        </View>
      ) : null}

      {showDeliveryDetails ? renderDeliveryDetails() : null}

      {job.status === "READY" ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
        >
          <View style={styles.header}>
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderNumber}>
                  {job.isBundledDelivery ? "Bundled Delivery" : `Order ${orderDisplayId}`}
                </Text>
                <Text style={styles.orderTime}>
                  {formatDate(job.createdAt)} • {formatTime(job.createdAt)}
                </Text>
              </View>
              <View style={styles.headerRight}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>READY</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReceiptVisible(true)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Text style={styles.orderMetaLink}>Order details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="navigate" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Pickup & Drop</Text>
            </View>
            <View style={styles.readyRouteCard}>
              <View style={styles.readyRouteTimeline}>
                {pickupStops.map((stop, index) => (
                  <React.Fragment key={stop.orderId || `${job._id}-pin-${index}`}>
                    <View style={styles.readyRouteIconWrap}>
                      <Ionicons name="restaurant-outline" size={16} color="#667085" />
                    </View>
                    {index < pickupStops.length - 1 ? (
                      <View style={styles.readyRouteDashTrack}>
                        {Array.from({ length: 4 }).map((_, dashIndex) => (
                          <View key={`mid-${index}-${dashIndex}`} style={styles.readyRouteDashDot} />
                        ))}
                      </View>
                    ) : null}
                  </React.Fragment>
                ))}
                <View style={styles.readyRouteDashTrack}>
                  {Array.from({ length: 5 }).map((_, dashIndex) => (
                    <View key={`drop-${dashIndex}`} style={styles.readyRouteDashDot} />
                  ))}
                </View>
                <View style={styles.readyRouteIconWrap}>
                  <Ionicons name="person-outline" size={16} color="#667085" />
                </View>
              </View>

              <View style={styles.readyRouteInfo}>
                {pickupStops.map((stop, index) => {
                  const pickupDistance =
                    index === 0
                      ? typeof job.distanceToRestaurant === "number"
                        ? job.distanceToRestaurant
                        : typeof (job as any).distance === "number"
                          ? (job as any).distance
                          : null
                      : null;
                  return (
                    <View key={stop.orderId || `${job._id}-${index}`} style={styles.readyRouteInfoBlock}>
                      <Text style={styles.readyRouteTitleLine} numberOfLines={1}>
                        <Text style={styles.readyRouteName}>
                          {stop.partnerId?.restaurantName || stop.partnerId?.shopName || "Restaurant"}
                        </Text>
                        <Text style={styles.readyRouteDistance}> ({formatKm(pickupDistance)})</Text>
                      </Text>
                      <Text style={styles.readyRouteAddress} numberOfLines={3}>
                        {formatAddress(stop.partnerId?.address) || "Pickup address unavailable"}
                      </Text>
                      {stop.partnerId?.phone ? (
                        <TouchableOpacity
                          style={styles.readyRouteCall}
                          onPress={() => handleCall(stop.partnerId.phone)}
                        >
                          <Ionicons name="call-outline" size={14} color="#175CD3" />
                          <Text style={styles.readyRouteCallText}>Call restaurant</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
                <View style={styles.readyRouteInfoBlock}>
                  <Text style={styles.readyRouteTitleLine} numberOfLines={1}>
                    <Text style={styles.readyRouteName}>{job.customerId?.name || "Customer"}</Text>
                    <Text style={styles.readyRouteDistance}>
                      {" "}
                      (
                      {formatKm(
                        typeof job.distanceToCustomer === "number"
                          ? job.distanceToCustomer
                          : typeof job.estimatedDistance === "number"
                            ? job.estimatedDistance
                            : null
                      )}
                      )
                    </Text>
                  </Text>
                  <Text style={styles.readyRouteAddress} numberOfLines={4}>
                    {formatAddress(job.deliveryAddress) || "Drop address unavailable"}
                  </Text>
                  {job.customerId?.phone ? (
                    <TouchableOpacity
                      style={styles.readyRouteCall}
                      onPress={() => handleCall(job.customerId!.phone)}
                    >
                      <Ionicons name="call-outline" size={14} color="#175CD3" />
                      <Text style={styles.readyRouteCallText}>Call customer</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

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
              {Number(job.tipAmount || 0) > 0 ? (
                <View style={styles.earningRow}>
                  <Text style={styles.earningLabel}>Customer Tip</Text>
                  <Text style={styles.earningValue}>₹{job.tipAmount}</Text>
                </View>
              ) : null}
              <View style={styles.divider} />
              <View style={styles.totalEarningRow}>
                <Text style={styles.totalEarningLabel}>You'll Earn</Text>
                <Text style={styles.totalEarningValue}>₹{getJobRiderEarnings(job)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      ) : null}

      {(job.status === "READY" || showDeliveryDetails) && (
        <View style={[styles.bottomActionBar, { paddingBottom: bottomPad }]}>
          {renderSwipeActions()}
        </View>
      )}

      <Modal
        visible={receiptVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReceiptVisible(false)}
      >
        <View style={styles.receiptOverlay}>
          <View style={[styles.receiptSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.receiptTopBar}>
              <Text style={styles.receiptSheetTitle}>Order Receipt</Text>
              <TouchableOpacity
                style={styles.receiptCloseButton}
                onPress={() => setReceiptVisible(false)}
                hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              >
                <Ionicons name="close" size={22} color="#475467" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.receiptScroll}
              contentContainerStyle={styles.receiptScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.orderDetailsCard}>
                {renderReceiptContent()}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={codPaymentChoiceVisible} transparent animationType="fade" onRequestClose={() => setCodPaymentChoiceVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIcon, styles.confirmIconUpi]}>
              <Ionicons name="wallet-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.confirmTitle}>How is the customer paying?</Text>
            <Text style={styles.confirmText}>
              Collect Rs {job?.grandTotal} before completing delivery. Cash is held by you until deposit. UPI goes directly to Vyaha.
            </Text>
            <View style={styles.codChoiceList}>
              <TouchableOpacity style={styles.codChoiceButton} onPress={startCashCollection} disabled={upiLoading}>
                <Ionicons name="cash-outline" size={22} color="#15803D" />
                <View style={styles.codChoiceCopy}>
                  <Text style={styles.codChoiceTitle}>Cash</Text>
                  <Text style={styles.codChoiceSubtitle}>Customer pays notes/coins to you</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.codChoiceButton} onPress={startUpiCollection} disabled={upiLoading}>
                {upiLoading ? (
                  <ActivityIndicator color="#1D4ED8" />
                ) : (
                  <Ionicons name="qr-code-outline" size={22} color="#1D4ED8" />
                )}
                <View style={styles.codChoiceCopy}>
                  <Text style={styles.codChoiceTitle}>UPI Scanner</Text>
                  <Text style={styles.codChoiceSubtitle}>Show Vyaha QR — payment to our account</Text>
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.confirmSecondary} onPress={() => setCodPaymentChoiceVisible(false)}>
              <Text style={styles.confirmSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={upiPaymentVisible} animationType="slide" onRequestClose={() => setUpiPaymentVisible(false)}>
        <View style={[styles.upiFullOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.upiSheet}>
            <View style={styles.upiTopBar}>
              <View style={styles.upiTopBarCopy}>
                <Text style={styles.upiHeaderTitle}>Scan & pay Vyaha</Text>
                <Text style={styles.upiMetaLine}>
                  Rs {codUpiSession?.amount || job?.grandTotal} · Ref {codUpiSession?.orderRef || orderId.slice(-6).toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.upiCloseButton}
                onPress={() => setUpiPaymentVisible(false)}
                hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              >
                <Ionicons name="close" size={20} color="#475467" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrStage}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.qrPulseRing,
                  { opacity: qrRingOpacity, transform: [{ scale: qrRingScale }] }
                ]}
              />
              <View style={styles.qrFocusShell}>
                {codQrDisplayUri ? (
                  showRazorpayPoster ? (
                    <Image
                      source={{ uri: codQrDisplayUri }}
                      style={styles.qrPosterZoomed}
                    />
                  ) : (
                    <Image
                      source={{ uri: codQrDisplayUri }}
                      style={styles.nativeQrImage}
                      resizeMode="contain"
                    />
                  )
                ) : (
                  <ActivityIndicator color="#1D4ED8" size="large" />
                )}
              </View>
            </View>

            <Text style={styles.qrScanHint}>Customer scans with any UPI app · Vyaha receives payment directly</Text>

            {upiPaymentPaid ? (
              <View style={styles.upiPaidBanner}>
                <Ionicons name="checkmark-circle" size={22} color="#166534" />
                <Text style={styles.upiPaidText}>Payment received — complete delivery</Text>
              </View>
            ) : (
              <Text style={styles.upiWaitingText}>
                {upiAwaitingPayment || upiPolling
                  ? "Confirming payment with Vyaha..."
                  : "Waiting for customer payment..."}
              </Text>
            )}

            <View style={styles.upiFooterActions}>
              <TouchableOpacity style={styles.confirmSecondary} onPress={() => setUpiPaymentVisible(false)} disabled={upiLoading || updating}>
                <Text style={styles.confirmSecondaryText}>Back</Text>
              </TouchableOpacity>
              {!upiPaymentPaid ? (
                <TouchableOpacity
                  style={[styles.confirmPrimary, styles.confirmPrimaryUpi]}
                  onPress={() => {
                    if (codUpiSession?.manualConfirmRequired) {
                      void handleManualUpiConfirm();
                    } else {
                      void refreshUpiPaymentStatus();
                    }
                  }}
                  disabled={upiPolling || upiLoading}
                >
                  {upiPolling ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmPrimaryText}>
                      {codUpiSession?.manualConfirmRequired ? "Customer Paid" : "Check Payment"}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.confirmPrimary, styles.confirmPrimaryUpi, !upiPaymentPaid && styles.confirmPrimaryDisabled]}
                onPress={completeUpiDelivery}
                disabled={!upiPaymentPaid || updating}
              >
                {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmPrimaryText}>Complete Delivery</Text>}
              </TouchableOpacity>
            </View>

            {!upiPaymentPaid ? (
              <TouchableOpacity
                style={styles.upiManualVerifyButton}
                onPress={handleRiderManualVerify}
                disabled={upiLoading || updating}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color="#1D4ED8" />
                <Text style={styles.upiManualVerifyText}>Payment done — verify manually</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

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
                  requestDeliveryVerification(job.grandTotal, "CASH");
                }}
                disabled={updating}
              >
                {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmPrimaryText}>Collected</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={otpConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!updating && !uploadingBypassProof) {
            resetOtpModal();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIcon, otpBypassMode && styles.confirmIconWarn]}>
              <Ionicons name={otpBypassMode ? "camera-outline" : "keypad-outline"} size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.confirmTitle}>
              {otpBypassMode ? "Send delivery proof" : "Enter verification code"}
            </Text>
            <Text style={styles.confirmText}>
              {otpBypassMode
                ? "If the customer cannot share the code, take a clear photo of the delivered order. It will be sent to Vyaha customer support and the order will be marked delivered."
                : "Ask the customer for the 4-digit code shown in their NearU app, then enter it to complete delivery."}
            </Text>

            {!otpBypassMode ? (
              <>
                <TextInput
                  style={styles.otpInput}
                  value={deliveryOtp}
                  onChangeText={(text) => setDeliveryOtp(text.replace(/[^0-9]/g, "").slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="••••"
                  placeholderTextColor="#98A2B3"
                  editable={!updating}
                  autoFocus
                  textAlign="center"
                />
                <TouchableOpacity
                  style={styles.otpBypassLink}
                  onPress={() => setOtpBypassMode(true)}
                  disabled={updating}
                >
                  <Text style={styles.otpBypassLinkText}>Can't get the code? Send proof to Vyaha support</Text>
                </TouchableOpacity>
                <View style={styles.confirmActions}>
                  <TouchableOpacity style={styles.confirmSecondary} onPress={resetOtpModal} disabled={updating}>
                    <Text style={styles.confirmSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmPrimary, deliveryOtp.length !== 4 && styles.confirmPrimaryDisabled]}
                    onPress={() => {
                      void submitDeliveryVerification();
                    }}
                    disabled={updating || deliveryOtp.length !== 4}
                  >
                    {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmPrimaryText}>Verify & deliver</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {bypassProofUrl ? (
                  <Image source={{ uri: bypassProofUrl }} style={styles.bypassProofPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.bypassProofPlaceholder}>
                    <Ionicons name="image-outline" size={28} color="#98A2B3" />
                    <Text style={styles.bypassProofPlaceholderText}>No proof photo yet</Text>
                  </View>
                )}
                <View style={styles.bypassProofActions}>
                  <TouchableOpacity
                    style={styles.bypassProofButton}
                    onPress={() => {
                      void pickBypassProof("camera");
                    }}
                    disabled={updating || uploadingBypassProof}
                  >
                    <Ionicons name="camera-outline" size={18} color="#175CD3" />
                    <Text style={styles.bypassProofButtonText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bypassProofButton}
                    onPress={() => {
                      void pickBypassProof("gallery");
                    }}
                    disabled={updating || uploadingBypassProof}
                  >
                    <Ionicons name="images-outline" size={18} color="#175CD3" />
                    <Text style={styles.bypassProofButtonText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
                {uploadingBypassProof ? (
                  <View style={styles.bypassUploadingRow}>
                    <ActivityIndicator color="#4CAF50" />
                    <Text style={styles.bypassUploadingText}>Uploading proof...</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.otpBypassLink}
                  onPress={() => {
                    setOtpBypassMode(false);
                    setBypassProofUrl("");
                  }}
                  disabled={updating || uploadingBypassProof}
                >
                  <Text style={styles.otpBypassLinkText}>Back to verification code</Text>
                </TouchableOpacity>
                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={styles.confirmSecondary}
                    onPress={resetOtpModal}
                    disabled={updating || uploadingBypassProof}
                  >
                    <Text style={styles.confirmSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmPrimary, !bypassProofUrl && styles.confirmPrimaryDisabled]}
                    onPress={() => {
                      void submitOtpBypassDelivery();
                    }}
                    disabled={updating || uploadingBypassProof || !bypassProofUrl}
                  >
                    {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmPrimaryText}>Submit & deliver</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  navigationBody: {
    flex: 1,
  },
  mapArea: {
    flex: 1,
    minHeight: 180,
    backgroundColor: '#E8EEF5',
  },
  bottomDock: {
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  dockSwipeWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 12,
  },
  stopSheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  stopSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 12,
  },
  stopTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  deliveryMetaRow: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  deliverScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  deliverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
  },
  deliverTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  deliverCustomerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  deliverCustomerAddress: {
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
  },
  deliverActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  deliverCallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  deliverCallText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  deliverMapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  deliverMapButtonFull: {
    flex: 1,
  },
  deliverMapText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deliverDivider: {
    height: 1,
    backgroundColor: '#EEF2F6',
    marginVertical: 16,
  },
  deliverOrderMeta: {
    marginBottom: 14,
  },
  deliverOrderId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  deliverOrderWhen: {
    marginTop: 4,
    fontSize: 13,
    color: '#667085',
  },
  deliverItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  deliverItemRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  deliverItemLeft: {
    flex: 1,
    paddingRight: 8,
  },
  deliverItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  deliverItemQty: {
    marginTop: 2,
    fontSize: 12,
    color: '#98A2B3',
  },
  deliverItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  deliverTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deliverTotalLabel: {
    fontSize: 13,
    color: '#667085',
  },
  deliverTotalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#344054',
  },
  deliverGrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  deliverGrandLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  deliverGrandValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16A34A',
  },
  deliverPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliverPaymentLabel: {
    fontSize: 13,
    color: '#667085',
  },
  deliverPaymentPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  deliverPaymentPillCod: {
    backgroundColor: '#FFF7ED',
  },
  deliverPaymentPillPaid: {
    backgroundColor: '#ECFDF3',
  },
  deliverPaymentPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deliverPaymentPillTextCod: {
    color: '#C2410C',
  },
  deliverPaymentPillTextPaid: {
    color: '#15803D',
  },
  deliverCollectBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#ECFDF3',
  },
  deliverCollectText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  deliverNoteBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  deliverNoteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667085',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  deliverNoteText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#374151',
  },
  orderMetaRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  orderMetaNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  orderMetaLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  receiptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  receiptSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  receiptTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  receiptCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  receiptScroll: {
    flexGrow: 0,
  },
  receiptScrollContent: {
    paddingBottom: 8,
  },
  receiptHeader: {
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  receiptTime: {
    marginTop: 4,
    fontSize: 13,
    color: '#667085',
  },
  receiptNoteLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#667085',
    marginBottom: 4,
  },
  receiptNoteText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    fontStyle: 'italic',
  },
  stopBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stopBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stopName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  readyByBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  readyByText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4E89',
  },
  stopAddress: {
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
    marginBottom: 12,
  },
  stopActions: {
    flexDirection: 'row',
    gap: 10,
  },
  stopActionOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  stopActionOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
  },
  stopActionFilled: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  stopActionFilledFull: {
    flex: 1,
  },
  stopActionFilledText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  codHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
  },
  codHintText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803D',
  },
  noteInline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  noteInlineText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#667085',
    fontStyle: 'italic',
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  liveCallButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerCallText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  bottomActionBar: {
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
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
  readyRouteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    flexDirection: "row",
    gap: 12
  },
  readyRouteTimeline: {
    width: 28,
    alignItems: "center",
    paddingTop: 2
  },
  readyRouteIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center"
  },
  readyRouteDashTrack: {
    width: 2,
    flexGrow: 1,
    minHeight: 18,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 4
  },
  readyRouteDashDot: {
    width: 2,
    height: 3,
    borderRadius: 1,
    backgroundColor: "#D0D5DD"
  },
  readyRouteInfo: {
    flex: 1,
    gap: 14
  },
  readyRouteInfoBlock: {
    gap: 4
  },
  readyRouteTitleLine: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  readyRouteName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937"
  },
  readyRouteDistance: {
    fontSize: 13,
    fontWeight: "700",
    color: "#667085"
  },
  readyRouteAddress: {
    fontSize: 13,
    lineHeight: 18,
    color: "#667085"
  },
  readyRouteCall: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start"
  },
  readyRouteCallText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#175CD3"
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
    fontWeight: '700',
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
    height: 24,
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
  otpInput: {
    marginTop: 18,
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#D0D5DD",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 12,
    color: "#1F2937"
  },
  otpBypassLink: {
    marginTop: 14,
    paddingVertical: 4
  },
  otpBypassLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#175CD3",
    textAlign: "center"
  },
  bypassProofPreview: {
    marginTop: 16,
    width: "100%",
    height: 160,
    borderRadius: 16,
    backgroundColor: "#F2F4F7"
  },
  bypassProofPlaceholder: {
    marginTop: 16,
    width: "100%",
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderStyle: "dashed",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  bypassProofPlaceholderText: {
    fontSize: 13,
    color: "#98A2B3",
    fontWeight: "600"
  },
  bypassProofActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  bypassProofButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#EFF8FF",
    borderWidth: 1,
    borderColor: "#B2DDFF"
  },
  bypassProofButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#175CD3"
  },
  bypassUploadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  bypassUploadingText: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "600"
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
  confirmIconUpi: {
    backgroundColor: "#2563EB"
  },
  codChoiceList: {
    width: "100%",
    marginTop: 18,
    gap: 10
  },
  codChoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  codChoiceCopy: {
    flex: 1
  },
  codChoiceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937"
  },
  codChoiceSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#667085"
  },
  upiFullOverlay: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12
  },
  upiSheet: {
    flex: 1,
    justifyContent: "space-between"
  },
  upiTopBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 4
  },
  upiTopBarCopy: {
    flex: 1
  },
  upiMetaLine: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB"
  },
  upiHeaderTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827"
  },
  upiCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6"
  },
  qrStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: UPI_FOCUS_SIZE + 12
  },
  qrPulseRing: {
    position: "absolute",
    width: UPI_FOCUS_SIZE + 20,
    height: UPI_FOCUS_SIZE + 20,
    borderRadius: (UPI_FOCUS_SIZE + 20) / 2,
    borderWidth: 2,
    borderColor: "#60A5FA",
    backgroundColor: "transparent"
  },
  qrFocusShell: {
    width: UPI_FOCUS_SIZE,
    height: UPI_FOCUS_SIZE,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#93C5FD",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden"
  },
  qrPosterZoomed: {
    position: "absolute",
    width: RZPAY_IMG_W,
    height: RZPAY_IMG_H,
    left: RZPAY_IMG_LEFT,
    top: RZPAY_IMG_TOP
  },
  nativeQrImage: {
    width: UPI_NATIVE_QR_SIZE,
    height: UPI_NATIVE_QR_SIZE,
    backgroundColor: "#FFFFFF"
  },
  qrScanHint: {
    marginTop: 0,
    marginBottom: 6,
    fontSize: 12,
    lineHeight: 16,
    color: "#64748B",
    textAlign: "center"
  },
  upiPaidBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#DCFCE7"
  },
  upiPaidText: {
    marginBottom: 8,
    fontSize: 13,
    color: "#15803D",
    fontWeight: "700",
    textAlign: "center"
  },
  upiWaitingText: {
    marginBottom: 8,
    fontSize: 13,
    color: "#B45309",
    textAlign: "center"
  },
  upiFooterActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    paddingBottom: 4
  },
  confirmPrimaryUpi: {
    backgroundColor: "#2563EB"
  },
  confirmPrimaryDisabled: {
    opacity: 0.5
  },
  upiManualVerifyButton: {
    marginTop: 10,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF"
  },
  upiManualVerifyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D4ED8"
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