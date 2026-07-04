import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  cacheDeletionRequest,
  cancelAccountDeletionRequest,
  getCachedDeletionRequest,
  getMyDeletionRequest,
  subscribeDeletionRequestRefresh,
  type AccountDeletionRequest
} from "../api/accountDeletion.api";
import { unregisterPushNotifications } from "../services/notifications";

const GREEN_PRIMARY = "#16A34A";
const GREEN_DEEP = "#166534";
const GREEN_SOFT = "#F0FDF4";

type Props = {
  navigation: any;
  route: {
    params?: {
      initialRequest?: AccountDeletionRequest;
    };
  };
};

const formatDateTime = (value?: string) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function AccountDeletionReviewScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const initialRequest = route.params?.initialRequest;
  const [loading, setLoading] = useState(!initialRequest);
  const [refreshing, setRefreshing] = useState(false);
  const [request, setRequest] = useState<AccountDeletionRequest | null>(initialRequest || null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRequest = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getMyDeletionRequest();
      setRequest(data);
      setLoadError(null);
      return data;
    } catch (error: any) {
      const cached = await getCachedDeletionRequest();
      if (cached) {
        setRequest(cached);
        setLoadError(null);
        return cached;
      }
      if (initialRequest) {
        setRequest(initialRequest);
        setLoadError(null);
        return initialRequest;
      }
      setLoadError(error?.message || "Could not load your deletion request.");
      setRequest(null);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [initialRequest]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Force-fetch from API, bypassing cache and initialRequest
      const data = await getMyDeletionRequest();
      setRequest(data);
      setLoadError(null);
    } catch {
      // Keep current state on refresh failure
    } finally {
      setRefreshing(false);
    }
  };

  const refreshFromApi = useCallback(async () => {
    try {
      const data = await getMyDeletionRequest();
      setRequest(data);
      setLoadError(null);
    } catch {
      // Keep current state on refresh failure
    }
  }, []);

  useEffect(() => {
    return subscribeDeletionRequestRefresh((request) => {
      if (request) {
        setRequest(request);
        setLoadError(null);
        return;
      }
      void refreshFromApi();
    });
  }, [refreshFromApi]);

  useFocusEffect(
    useCallback(() => {
      void loadRequest(Boolean(initialRequest));
      pollRef.current = setInterval(() => {
        getMyDeletionRequest()
          .then((data) => setRequest(data))
          .catch(() => {});
      }, 30000);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [initialRequest, loadRequest])
  );

  useEffect(() => {
    const isPending = request?.status === "PENDING";
    navigation.setOptions({
      title: "Deletion Review",
      headerLeft: isPending ? () => null : undefined,
      gestureEnabled: !isPending
    });
  }, [navigation, request?.status]);

  useEffect(() => {
    if (request?.status !== "PENDING") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, [request?.status]);

  const handleLogout = async () => {
    setActionLoading(true);
    try {
      await unregisterPushNotifications().catch(() => {});
      await cacheDeletionRequest(null);
      await AsyncStorage.multiRemove(["token", "refreshToken", "user"]);
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setActionLoading(true);
    try {
      await cancelAccountDeletionRequest();
      await cacheDeletionRequest(null);
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoToApp = () => {
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  const renderEmpty = () => (
    <View style={styles.stateCard}>
      <View style={[styles.iconCircle, styles.iconNeutral]}>
        <Ionicons name="document-text-outline" size={28} color="#667085" />
      </View>
      <Text style={styles.stateTitle}>No deletion request found</Text>
      <Text style={styles.stateText}>
        {loadError || "We could not find an active account deletion request for this delivery profile."}
      </Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => void loadRequest()}>
        <Text style={styles.primaryBtnText}>Try again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.linkBtnText}>Go back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPending = (item: AccountDeletionRequest) => (
    <View style={styles.stateCard}>
      <View style={[styles.iconCircle, styles.iconPending]}>
        <Ionicons name="hourglass-outline" size={28} color="#B45309" />
      </View>
      <Text style={styles.stateTitle}>Under review</Text>
      <Text style={styles.stateText}>
        Your account deletion request will be reviewed within 24 hours. Our team will verify pending payouts, COD balance, and active jobs before processing.
      </Text>

      <View style={styles.detailBox}>
        <Text style={styles.detailLabel}>Submitted</Text>
        <Text style={styles.detailValue}>{formatDateTime(item.createdAt)}</Text>
        <Text style={[styles.detailLabel, styles.detailLabelSpaced]}>Your reason</Text>
        <Text style={styles.detailValueMultiline}>{item.reason}</Text>
      </View>

      <View style={styles.infoStrip}>
        <Ionicons name="refresh-outline" size={16} color={GREEN_DEEP} />
        <Text style={styles.infoStripText}>This page refreshes automatically. Pull down to check for updates.</Text>
      </View>

      <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancelRequest} disabled={actionLoading}>
        {actionLoading ? (
          <ActivityIndicator color="#B45309" />
        ) : (
          <Text style={styles.secondaryBtnText}>Cancel request</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderApproved = () => (
    <View style={styles.stateCard}>
      <View style={[styles.iconCircle, styles.iconApproved]}>
        <Ionicons name="checkmark-circle" size={30} color={GREEN_PRIMARY} />
      </View>
      <Text style={styles.stateTitle}>Account deleted</Text>
      <Text style={styles.stateText}>
        Your account has been deleted as requested. Sign in again only if you want to register a new delivery profile in the future.
      </Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={handleLogout} disabled={actionLoading}>
        {actionLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Go to login page</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderRejected = (item: AccountDeletionRequest) => (
    <View style={styles.stateCard}>
      <View style={[styles.iconCircle, styles.iconRejected]}>
        <Ionicons name="close-circle" size={30} color="#B42318" />
      </View>
      <Text style={styles.stateTitle}>Request not approved</Text>
      <Text style={styles.stateText}>
        Your account has not been deleted. Please complete the steps below, then submit a new deletion request.
      </Text>

      <View style={styles.rejectBox}>
        <Text style={styles.rejectLabel}>Reason from our team</Text>
        <Text style={styles.rejectReason}>
          {item.rejectionReason?.trim() || "Please resolve pending payouts, COD balance, or active jobs and try again."}
        </Text>
      </View>

      <View style={styles.stepsBox}>
        <Text style={styles.stepsTitle}>What to do next</Text>
        <Text style={styles.stepItem}>1. Complete the required actions mentioned above.</Text>
        <Text style={styles.stepItem}>2. Continue using the app as usual.</Text>
        <Text style={styles.stepItem}>3. Submit a new deletion request from Profile when you are ready.</Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={handleGoToApp}>
        <Text style={styles.primaryBtnText}>Get in app</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (!request || request.status === "CANCELLED") return renderEmpty();
    if (request.status === "PENDING") return renderPending(request);
    if (request.status === "APPROVED") return renderApproved();
    if (request.status === "REJECTED") return renderRejected(request);
    return renderEmpty();
  };

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={GREEN_PRIMARY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN_PRIMARY} />}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FB"
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1
  },
  stateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#EAECF0"
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16
  },
  iconNeutral: { backgroundColor: "#F2F4F7" },
  iconPending: { backgroundColor: "#FFFBEB" },
  iconApproved: { backgroundColor: GREEN_SOFT },
  iconRejected: { backgroundColor: "#FEF3F2" },
  stateTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#101828",
    textAlign: "center"
  },
  stateText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#667085",
    textAlign: "center"
  },
  detailBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EAECF0"
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#98A2B3",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  detailLabelSpaced: {
    marginTop: 14
  },
  detailValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#344054"
  },
  detailValueMultiline: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#344054",
    fontWeight: "600"
  },
  infoStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: GREEN_SOFT
  },
  infoStripText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: GREEN_DEEP,
    fontWeight: "600"
  },
  rejectBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FEF3F2",
    borderWidth: 1,
    borderColor: "#FECDCA"
  },
  rejectLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B42318",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  rejectReason: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#912018",
    fontWeight: "600"
  },
  stepsBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EAECF0"
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#344054",
    marginBottom: 8
  },
  stepItem: {
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
    marginTop: 4
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: GREEN_PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center"
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFFFF"
  },
  secondaryBtnText: {
    color: "#B45309",
    fontSize: 14,
    fontWeight: "700"
  },
  linkBtn: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 8
  },
  linkBtnText: {
    color: GREEN_DEEP,
    fontSize: 14,
    fontWeight: "700"
  }
});
