import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  Keyboard,
  Pressable,
  Dimensions,
  Platform,
  type LayoutChangeEvent,
  type TextInput as TextInputType
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadMultipart } from "../api/client";
import {
  getCashLedger,
  getDeliveryStats,
  getMyDeliveryOrders,
  getWithdrawalWallet,
  requestWithdrawal,
  submitCashDeposit,
  type CashLedgerSummary,
  type CashLedgerEntry,
  type DeliveryOrder,
  type WithdrawalWallet
} from "../api/delivery.api";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { getOrderRiderEarnings, getOrderTipAmount, parseMoneyInput } from "../utils/riderEarnings";

type EarningHistoryItem = {
  id: string;
  date: string;
  orderLabel: string;
  amount: number;
  deliveries: number;
  deliveredAt: number;
};

export default function EarningsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cashLedger, setCashLedger] = useState<CashLedgerSummary | null>(null);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositReference, setDepositReference] = useState("");
  const [depositProofUrl, setDepositProofUrl] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [earningsHistory, setEarningsHistory] = useState<EarningHistoryItem[]>([]);
  const [earningsModalVisible, setEarningsModalVisible] = useState(false);
  const [withdrawalWallet, setWithdrawalWallet] = useState<WithdrawalWallet | null>(null);
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);
  const [payoutHistoryVisible, setPayoutHistoryVisible] = useState(false);
  const [cashLedgerModalVisible, setCashLedgerModalVisible] = useState(false);
  const [cashRefreshing, setCashRefreshing] = useState(false);
  const [walletRefreshing, setWalletRefreshing] = useState(false);
  const depositScrollRef = useRef<ScrollView>(null);
  const depositFieldOffsets = useRef<Record<string, number>>({});
  const depositInputRefs = useRef<Record<string, TextInputType | null>>({});
  const activeDepositField = useRef<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const windowHeight = Dimensions.get("window").height;
  const depositActionsHeight = 72;

  const refreshWithdrawalWallet = useCallback(async () => {
    try {
      setWalletRefreshing(true);
      const walletResponse = await getWithdrawalWallet();
      if (walletResponse.success && walletResponse.data) {
        setWithdrawalWallet(walletResponse.data);
      }
    } catch {
      Alert.alert("Refresh failed", "Could not update withdrawal status. Please try again.");
    } finally {
      setWalletRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshWithdrawalWallet();
    }, [refreshWithdrawalWallet])
  );

  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      
      // Load overall stats
      const statsResponse = await getDeliveryStats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      const cashResponse = await getCashLedger();
      if (cashResponse.success && cashResponse.data) {
        setCashLedger(cashResponse.data);
      }

      const ordersResponse = await getMyDeliveryOrders();
      if (ordersResponse.success && ordersResponse.data) {
        setEarningsHistory(buildEarningsHistory(ordersResponse.data));
      }

      const walletResponse = await getWithdrawalWallet();
      if (walletResponse.success && walletResponse.data) {
        setWithdrawalWallet(walletResponse.data);
      }
    } catch (error: any) {
      console.error("Error loading earnings:", error);
      Alert.alert("Error", "Failed to load earnings data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEarningsData();
  };

  const refreshCashBalance = async () => {
    try {
      setCashRefreshing(true);
      const [cashResponse, statsResponse] = await Promise.all([getCashLedger(), getDeliveryStats()]);
      if (cashResponse.success && cashResponse.data) {
        setCashLedger(cashResponse.data);
      }
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch {
      Alert.alert("Refresh failed", "Could not update COD cash balance. Please try again.");
    } finally {
      setCashRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatLedgerTitle = (type: CashLedgerEntry["type"]) => {
    switch (type) {
      case "COD_COLLECTED":
        return "COD collected";
      case "CASH_DEPOSIT_VERIFIED":
        return "COD returned";
      case "CASH_DEPOSIT_SUBMITTED":
        return "Deposit pending";
      case "EARNINGS_OFFSET":
        return "Earnings offset";
      default:
        return type.replace(/_/g, " ");
    }
  };

  const registerDepositFieldLayout = (fieldKey: string) => (event: LayoutChangeEvent) => {
    depositFieldOffsets.current[fieldKey] = event.nativeEvent.layout.y;
  };

  const scrollDepositFieldIntoView = useCallback((fieldKey: string) => {
    activeDepositField.current = fieldKey;
    requestAnimationFrame(() => {
      if (fieldKey === "reference" || fieldKey === "note") {
        depositScrollRef.current?.scrollToEnd({ animated: true });
        return;
      }
      const offset = Math.max((depositFieldOffsets.current[fieldKey] || 0) - 24, 0);
      depositScrollRef.current?.scrollTo({ y: offset, animated: true });
    });
  }, []);

  useEffect(() => {
    if (!depositModalVisible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      if (activeDepositField.current) {
        setTimeout(() => {
          if (activeDepositField.current) {
            scrollDepositFieldIntoView(activeDepositField.current);
          }
        }, Platform.OS === "ios" ? 0 : 60);
      }
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [depositModalVisible, scrollDepositFieldIntoView]);

  const pickDepositProof = async () => {
    Keyboard.dismiss();
    activeDepositField.current = null;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission needed", "Allow gallery access to upload your deposit proof.");
      return;
    }

    setDepositModalVisible(false);
    await new Promise((resolve) => setTimeout(resolve, Platform.OS === "android" ? 220 : 120));

    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false
      });
    } catch (error: any) {
      setDepositModalVisible(true);
      Alert.alert("Upload failed", error?.message || "Could not open your photo library.");
      return;
    }

    setDepositModalVisible(true);

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    try {
      setUploadingProof(true);
      const asset = result.assets[0];
      const fileName = asset.fileName || `deposit-proof-${Date.now()}.jpg`;
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
      setDepositProofUrl(response.data.url);
    } catch (error: any) {
      Alert.alert("Upload failed", error.message || "Could not upload proof screenshot");
    } finally {
      setUploadingProof(false);
    }
  };

  const formatEarningDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (left: Date, right: Date) =>
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate();

    if (sameDay(date, today)) return "Today";
    if (sameDay(date, yesterday)) return "Yesterday";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const buildEarningsHistory = (orders: DeliveryOrder[]): EarningHistoryItem[] =>
    orders
      .filter((order) => order.status === "DELIVERED")
      .map((order) => {
        const deliveredAt = new Date(order.deliveredAt || order.updatedAt || order.createdAt).getTime();
        const deliveries = Math.max(order.deliveryBundleSize || order.pickupStops?.length || order.bundleOrders?.length || 1, 1);
        const tipAmount = getOrderTipAmount(order);
        const earnings = getOrderRiderEarnings(order);
        const orderLabel = order.isBundledDelivery
          ? `Bundled #${order._id.slice(-6).toUpperCase()}`
          : `Order #${order._id.slice(-6).toUpperCase()}`;

        return {
          id: order._id,
          date: Number.isNaN(deliveredAt) ? "Delivered" : formatEarningDate(deliveredAt),
          orderLabel: tipAmount > 0 ? `${orderLabel} · incl. ₹${tipAmount} tip` : orderLabel,
          amount: earnings,
          deliveries,
          deliveredAt: Number.isNaN(deliveredAt) ? 0 : deliveredAt
        };
      })
      .sort((left, right) => right.deliveredAt - left.deliveredAt);

  const openDepositModal = () => {
    const balance = cashLedger?.cashBalance || stats?.cashBalance || 0;
    setDepositAmount(balance > 0 ? String(Math.round(balance)) : "");
    setDepositReference("");
    setDepositProofUrl("");
    setDepositNote("");
    setDepositModalVisible(true);
  };

  const handleSubmitDeposit = async () => {
    const amount = parseMoneyInput(depositAmount);
    if (amount <= 0) {
      Alert.alert("Invalid amount", "Enter the amount you deposited back to the platform.");
      return;
    }
    if (!depositProofUrl.trim()) {
      Alert.alert("Proof required", "Upload a screenshot of your deposit or UPI payment proof.");
      return;
    }
    if (amount > (cashLedger?.cashBalance || 0)) {
      Alert.alert("Invalid amount", "Deposit amount cannot be more than your current cash balance.");
      return;
    }

    try {
      setSubmittingDeposit(true);
      const response = await submitCashDeposit({
        amount,
        reference: depositReference.trim(),
        proofUrl: depositProofUrl.trim(),
        note: depositNote.trim()
      });
      if (!response.success) {
        Alert.alert("Deposit failed", response.message || "Could not submit deposit details.");
        return;
      }

      Alert.alert(
        "Submitted",
        "Your COD cash balance is cleared. Admin will verify your deposit — if rejected, the amount will be added back."
      );
      setDepositModalVisible(false);
      setDepositAmount("");
      setDepositReference("");
      setDepositProofUrl("");
      setDepositNote("");
      loadEarningsData();
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!withdrawalWallet?.bankVerified) {
      const bankStatus = withdrawalWallet?.bankVerificationStatus || "";
      if (bankStatus === "PENDING") {
        Alert.alert("Bank under review", "Your bank details are waiting for admin verification.");
        return;
      }
      if (bankStatus === "REJECTED") {
        Alert.alert(
          "Bank details rejected",
          withdrawalWallet?.bankReviewComment || "Update your bank details in Profile and submit again.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Go to Profile", onPress: () => navigation.navigate("Profile") }
          ]
        );
        return;
      }
      Alert.alert(
        "Bank details required",
        "Add and verify your bank account or UPI ID in Profile before requesting a withdrawal.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Profile", onPress: () => navigation.navigate("Profile") }
        ]
      );
      return;
    }

    if (withdrawalWallet.pendingRequest) {
      Alert.alert(
        "Request pending",
        `Your withdrawal request of ${formatCurrency(withdrawalWallet.pendingRequest.amount)} is waiting for admin approval.`
      );
      return;
    }

    const available = withdrawalWallet.availableBalance || 0;
    if (available <= 0) {
      Alert.alert(
        "No balance available",
        withdrawalWallet.cashDueToPlatform > 0
          ? "Settle your COD cash balance with Vyaha before withdrawing wallet earnings."
          : "No delivered earnings are available for withdrawal yet."
      );
      return;
    }

    Alert.alert(
      "Request withdrawal",
      `Request ${formatCurrency(available)} to be paid to your bank/UPI? Admin will verify and transfer the amount.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request",
          onPress: async () => {
            try {
              setRequestingWithdrawal(true);
              const response = await requestWithdrawal();
              if (!response.success) {
                Alert.alert("Request failed", response.message || "Could not submit withdrawal request.");
                return;
              }
              Alert.alert("Request sent", response.message || "Admin will process your payment soon.");
              loadEarningsData();
            } finally {
              setRequestingWithdrawal(false);
            }
          }
        }
      ]
    );
  };

  const recentEarnings = earningsHistory.slice(0, 3);
  const recentCashEntries = cashLedger?.entries?.slice(0, 3) ?? [];
  const walletBalance = withdrawalWallet?.walletBalance ?? withdrawalWallet?.grossEarnings ?? stats?.walletBalance ?? stats?.grossPendingEarnings ?? 0;
  const withdrawableNow = withdrawalWallet?.availableBalance ?? withdrawalWallet?.netPayable ?? 0;
  const totalPaidEarnings = withdrawalWallet?.totalPaidEarnings ?? stats?.totalEarnings ?? 0;
  const codCashBalance = cashLedger?.cashBalance || stats?.cashBalance || 0;
  const codDueToPlatform = withdrawalWallet?.cashDueToPlatform ?? codCashBalance;
  const depositSheetMaxHeight = Math.max(
    (keyboardHeight > 0
      ? windowHeight - keyboardHeight - insets.top - 12
      : windowHeight * 0.88) - depositActionsHeight,
    220
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safeAreaScreen, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 34 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} tintColor="#4CAF50" />}
      >
        {/* Wallet Hero */}
        <View style={styles.todayCard}>
        <Text style={styles.todayLabel}>WALLET</Text>
        <Text style={styles.todayAmount}>{formatCurrency(walletBalance)}</Text>
        <Text style={styles.walletSubtext}>
          Delivery fee + tips from completed orders{"\n"}
          Withdrawable now: {formatCurrency(withdrawableNow)}
          {codDueToPlatform > 0
            ? `\nDeposit ${formatCurrency(codDueToPlatform)} COD cash to Vyaha first to unlock withdrawal.`
            : ""}
        </Text>
        <View style={styles.todayStats}>
          <View style={styles.todayStatItem}>
            <Ionicons name="bicycle" size={16} color="rgba(255,255,255,0.95)" />
            <Text style={styles.todayStatText} numberOfLines={1}>
              {stats?.todaysDeliveries || 0} deliveries today
            </Text>
          </View>
          <View style={styles.todayStatItem}>
            <Ionicons name="receipt" size={16} color="rgba(255,255,255,0.95)" />
            <Text style={styles.todayStatText} numberOfLines={1}>
              {withdrawalWallet?.pendingPayoutOrderCount || 0} orders in wallet
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="cash" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.statValue}>{formatCurrency(totalPaidEarnings)}</Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
          <Text style={styles.statHint}>Paid to your account by Vyaha</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="bicycle" size={24} color="#2196F3" />
          </View>
          <Text style={styles.statValue}>{stats?.totalDeliveries || 0}</Text>
          <Text style={styles.statLabel}>Total Deliveries</Text>
        </View>
      </View>

      <View style={styles.cashCard}>
        <View style={styles.cashCardHeader}>
          <View style={styles.withdrawalHeader}>
            <Ionicons name="wallet-outline" size={24} color="#B45309" />
            <Text style={styles.withdrawalTitle}>COD Cash Balance</Text>
          </View>
          <TouchableOpacity
            style={styles.cashRefreshButton}
            onPress={refreshCashBalance}
            disabled={cashRefreshing}
            accessibilityLabel="Refresh COD cash balance"
          >
            {cashRefreshing ? (
              <ActivityIndicator size="small" color="#B45309" />
            ) : (
              <Ionicons name="refresh" size={20} color="#B45309" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.cashAmount}>{formatCurrency(codCashBalance)}</Text>
        <Text style={styles.withdrawalNote}>
          Cash you collected from customers on COD orders. This includes food bill, delivery fee, and tips. Deposit this full amount back to Vyaha. Your balance clears to ₹0 once submitted; admin verifies the deposit separately.
        </Text>
        <View style={styles.cashSummaryRow}>
          <Text style={styles.cashSummaryLabel}>Pending deposit verification</Text>
          <Text style={styles.cashSummaryValue}>
            {formatCurrency(cashLedger?.pendingDepositAmount || stats?.pendingDepositAmount || 0)}
          </Text>
        </View>
        <View style={styles.cashSummaryRow}>
          <Text style={styles.cashSummaryLabel}>COD returned to platform</Text>
          <Text style={[styles.cashSummaryValue, styles.ledgerAmountNegative]}>
            {formatCurrency(cashLedger?.totalCodReturned || 0)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.depositButton, codCashBalance <= 0 && styles.disabledButton]}
          disabled={codCashBalance <= 0}
          onPress={openDepositModal}
        >
          <Text style={styles.withdrawButtonText}>Submit Cash Deposit</Text>
        </TouchableOpacity>
        {(cashLedger?.entries?.length ?? 0) > 0 ? (
          <View style={styles.ledgerSectionHeader}>
            <Text style={styles.ledgerSectionTitle}>Recent activity</Text>
            <TouchableOpacity onPress={() => setCashLedgerModalVisible(true)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {recentCashEntries.map((entry) => (
          <View key={entry._id} style={styles.ledgerItem}>
            <View>
              <Text style={styles.ledgerTitle}>{formatLedgerTitle(entry.type)}</Text>
              <Text style={styles.ledgerMeta}>{new Date(entry.createdAt).toLocaleString()} · {entry.status}</Text>
            </View>
            <Text style={[
              styles.ledgerAmount,
              (entry.type === "CASH_DEPOSIT_VERIFIED" || entry.balanceDelta < 0) && styles.ledgerAmountNegative
            ]}>
              {entry.type === "CASH_DEPOSIT_VERIFIED" || entry.balanceDelta < 0 ? "-" : "+"}
              {formatCurrency(Math.abs(entry.balanceDelta || entry.amount))}
            </Text>
          </View>
        ))}
      </View>

      {/* Recent Earnings */}
      <View style={styles.recentCard}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent Earnings</Text>
          <TouchableOpacity
            onPress={() => setEarningsModalVisible(true)}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {recentEarnings.length > 0 ? recentEarnings.map((item) => (
          <View key={item.id} style={styles.recentItem}>
            <View>
              <Text style={styles.recentDate}>{item.date}</Text>
              <Text style={styles.recentDeliveries}>{item.orderLabel} · {item.deliveries} {item.deliveries === 1 ? "delivery" : "deliveries"}</Text>
            </View>
            <Text style={styles.recentAmount}>{formatCurrency(item.amount)}</Text>
          </View>
        )) : (
          <View style={styles.emptyEarningsBox}>
            <Ionicons name="receipt-outline" size={24} color="#9CA3AF" />
            <Text style={styles.emptyEarningsText}>No delivered earnings yet.</Text>
          </View>
        )}
      </View>

      {/* Withdraw */}
      <View style={styles.withdrawalCard}>
        <View style={styles.cashCardHeader}>
          <View style={styles.withdrawalHeader}>
            <Ionicons name="card" size={24} color="#4CAF50" />
            <Text style={styles.withdrawalTitle}>Withdraw Earnings</Text>
          </View>
          <TouchableOpacity
            style={styles.cashRefreshButton}
            onPress={refreshWithdrawalWallet}
            disabled={walletRefreshing}
            accessibilityLabel="Refresh withdrawal status"
          >
            {walletRefreshing ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Ionicons name="refresh" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.withdrawalNote}>
          Your wallet is separate from COD cash. Request a payout only after your COD cash balance is fully settled with Vyaha.
          {withdrawalWallet?.pendingPayoutOrderCount
            ? `\n\n${withdrawalWallet.pendingPayoutOrderCount} delivered order${withdrawalWallet.pendingPayoutOrderCount === 1 ? "" : "s"} in wallet`
            : ""}
        </Text>
        {withdrawalWallet?.pendingRequest ? (
          <View style={styles.pendingWithdrawalBanner}>
            <Ionicons name="time-outline" size={16} color="#B45309" />
            <Text style={styles.pendingWithdrawalText}>
              {formatCurrency(withdrawalWallet.pendingRequest.amount)} withdrawal pending admin approval
            </Text>
          </View>
        ) : withdrawalWallet?.lastPaidPayout || withdrawalWallet?.lastPaidWithdrawal ? (
          <View style={styles.paidWithdrawalBanner}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#166534" />
            <Text style={styles.paidWithdrawalText}>
              {formatCurrency(
                withdrawalWallet.lastPaidPayout?.amount || withdrawalWallet.lastPaidWithdrawal?.amount || 0
              )}{" "}
              paid to your account
              {(withdrawalWallet.lastPaidPayout?.paidAt || withdrawalWallet.lastPaidWithdrawal?.reviewedAt)
                ? ` · ${new Date(
                    withdrawalWallet.lastPaidPayout?.paidAt || withdrawalWallet.lastPaidWithdrawal?.reviewedAt || ""
                  ).toLocaleDateString("en-IN")}`
                : ""}
            </Text>
          </View>
        ) : null}
        {withdrawalWallet?.bankVerified ? (
          <Text style={styles.bankHint}>
            Payout to {withdrawalWallet.bankDetails.accountHolderName || "your account"}
            {withdrawalWallet.bankDetails.upiId
              ? ` · UPI ${withdrawalWallet.bankDetails.upiId}`
              : withdrawalWallet.bankDetails.maskedAccountNumber
                ? ` · ${withdrawalWallet.bankDetails.maskedAccountNumber}`
                : ""}
          </Text>
        ) : (
          <Text style={styles.bankHintWarning}>
            {withdrawalWallet?.bankVerificationStatus === "PENDING"
              ? "Bank details are under admin verification."
              : withdrawalWallet?.bankVerificationStatus === "REJECTED"
                ? withdrawalWallet.bankReviewComment || "Bank details rejected. Update them in Profile."
                : "Add and verify bank or UPI details in Profile to withdraw earnings."}
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.withdrawButton,
            ((withdrawalWallet?.availableBalance || 0) <= 0 || requestingWithdrawal || !!withdrawalWallet?.pendingRequest) &&
              styles.disabledButton
          ]}
          disabled={
            (withdrawalWallet?.availableBalance || 0) <= 0 ||
            requestingWithdrawal ||
            !!withdrawalWallet?.pendingRequest
          }
          onPress={handleRequestWithdrawal}
        >
          <Text style={styles.withdrawButtonText}>
            {requestingWithdrawal ? "Submitting..." : "Withdraw Earnings"}
          </Text>
        </TouchableOpacity>
        {(withdrawalWallet?.payouts?.length || withdrawalWallet?.withdrawalHistory?.length) ? (
          <TouchableOpacity style={styles.viewPayoutHistoryButton} onPress={() => setPayoutHistoryVisible(true)}>
            <Text style={styles.viewPayoutHistoryText}>View payment history</Text>
            <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Earnings are updated in real-time after each delivery
        </Text>
        </View>
      </ScrollView>

      <Modal
        visible={depositModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={[styles.modalDismissArea, keyboardHeight > 0 && styles.modalDismissAreaCompact]}
            onPress={() => setDepositModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheetWrap,
              {
                marginBottom: keyboardHeight,
                maxHeight: keyboardHeight > 0
                  ? windowHeight - keyboardHeight - insets.top
                  : windowHeight * 0.88
              }
            ]}
          >
            <View style={styles.depositModal}>
              <ScrollView
                ref={depositScrollRef}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator
                style={{ maxHeight: depositSheetMaxHeight }}
                contentContainerStyle={[
                  styles.depositModalScroll,
                  { paddingBottom: keyboardHeight > 0 ? 12 : 8 }
                ]}
              >
                <Text style={styles.modalTitle}>Submit Cash Deposit</Text>
                <Text style={styles.modalDescription}>
                  Enter details after depositing COD cash back to the platform. Your COD balance clears immediately; admin will verify the deposit. If rejected, the balance is restored.
                </Text>
                <Text style={styles.modalBalanceHint}>
                  Your COD cash balance: {formatCurrency(codCashBalance)}
                </Text>
                <View onLayout={registerDepositFieldLayout("amount")}>
                  <TextInput
                    ref={(ref) => {
                      depositInputRefs.current.amount = ref;
                    }}
                    style={styles.modalInput}
                    keyboardType="number-pad"
                    placeholder="Amount deposited"
                    placeholderTextColor="#6B7280"
                    value={depositAmount}
                    onChangeText={(value) => setDepositAmount(value.replace(/[^\d]/g, ""))}
                    onPressIn={() => scrollDepositFieldIntoView("amount")}
                    onFocus={() => scrollDepositFieldIntoView("amount")}
                  />
                </View>
                <TouchableOpacity
                  style={styles.useFullBalanceButton}
                  onPress={() => setDepositAmount(codCashBalance > 0 ? String(Math.round(codCashBalance)) : "")}
                >
                  <Text style={styles.useFullBalanceText}>Use full balance ({formatCurrency(codCashBalance)})</Text>
                </TouchableOpacity>
                <View onLayout={registerDepositFieldLayout("reference")}>
                  <TextInput
                    ref={(ref) => {
                      depositInputRefs.current.reference = ref;
                    }}
                    style={styles.modalInput}
                    placeholder="Reference / UTR"
                    placeholderTextColor="#6B7280"
                    value={depositReference}
                    onChangeText={setDepositReference}
                    returnKeyType="next"
                    onPressIn={() => scrollDepositFieldIntoView("reference")}
                    onFocus={() => scrollDepositFieldIntoView("reference")}
                    onSubmitEditing={() => depositInputRefs.current.note?.focus()}
                  />
                </View>
                <Text style={styles.proofLabel}>Deposit proof screenshot</Text>
                <TouchableOpacity style={styles.proofUploadButton} onPress={pickDepositProof} disabled={uploadingProof}>
                  {uploadingProof ? (
                    <ActivityIndicator color="#B45309" />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={20} color="#B45309" />
                      <Text style={styles.proofUploadText}>
                        {depositProofUrl ? "Change proof screenshot" : "Upload proof screenshot"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {depositProofUrl ? (
                  <Image source={{ uri: depositProofUrl }} style={styles.proofPreview} resizeMode="cover" />
                ) : null}
                <View onLayout={registerDepositFieldLayout("note")}>
                  <TextInput
                    ref={(ref) => {
                      depositInputRefs.current.note = ref;
                    }}
                    style={[styles.modalInput, styles.modalTextarea]}
                    placeholder="Note (optional)"
                    placeholderTextColor="#6B7280"
                    multiline
                    value={depositNote}
                    onChangeText={setDepositNote}
                    onPressIn={() => scrollDepositFieldIntoView("note")}
                    onFocus={() => scrollDepositFieldIntoView("note")}
                  />
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setDepositModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitButton} onPress={handleSubmitDeposit} disabled={submittingDeposit}>
                  <Text style={styles.withdrawButtonText}>{submittingDeposit ? "Submitting..." : "Submit"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={earningsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEarningsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.depositModal, { maxHeight: "80%" }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>All Earnings</Text>
              <TouchableOpacity onPress={() => setEarningsModalVisible(false)} accessibilityLabel="Close earnings history">
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {earningsHistory.length > 0 ? earningsHistory.map((item) => (
                <View key={item.id} style={styles.recentItem}>
                  <View>
                    <Text style={styles.recentDate}>{item.date}</Text>
                    <Text style={styles.recentDeliveries}>{item.orderLabel} · {item.deliveries} {item.deliveries === 1 ? "delivery" : "deliveries"}</Text>
                  </View>
                  <Text style={styles.recentAmount}>{formatCurrency(item.amount)}</Text>
                </View>
              )) : (
                <View style={styles.emptyEarningsBox}>
                  <Ionicons name="receipt-outline" size={24} color="#9CA3AF" />
                  <Text style={styles.emptyEarningsText}>No delivered earnings yet.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={cashLedgerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCashLedgerModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.depositModal, { maxHeight: "80%" }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>COD Cash History</Text>
              <TouchableOpacity onPress={() => setCashLedgerModalVisible(false)} accessibilityLabel="Close cash history">
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {cashLedger?.entries?.length ? cashLedger.entries.map((entry) => (
                <View key={entry._id} style={styles.ledgerItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ledgerTitle}>{formatLedgerTitle(entry.type)}</Text>
                    <Text style={styles.ledgerMeta}>{new Date(entry.createdAt).toLocaleString()} · {entry.status}</Text>
                  </View>
                  <Text style={[
                    styles.ledgerAmount,
                    (entry.type === "CASH_DEPOSIT_VERIFIED" || entry.balanceDelta < 0) && styles.ledgerAmountNegative
                  ]}>
                    {entry.type === "CASH_DEPOSIT_VERIFIED" || entry.balanceDelta < 0 ? "-" : "+"}
                    {formatCurrency(Math.abs(entry.balanceDelta || entry.amount))}
                  </Text>
                </View>
              )) : (
                <View style={styles.emptyEarningsBox}>
                  <Ionicons name="wallet-outline" size={24} color="#9CA3AF" />
                  <Text style={styles.emptyEarningsText}>No COD cash activity yet.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={payoutHistoryVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayoutHistoryVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.depositModal, { maxHeight: "80%" }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Payment History</Text>
              <TouchableOpacity onPress={() => setPayoutHistoryVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {withdrawalWallet?.payouts?.length ? (
                <>
                  <Text style={styles.historySectionTitle}>Completed payouts</Text>
                  {withdrawalWallet.payouts.map((payout) => (
                    <View key={payout._id} style={styles.payoutHistoryItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.payoutHistoryAmount}>{formatCurrency(payout.amount)}</Text>
                        <Text style={styles.payoutHistoryMeta}>
                          {payout.orderCount} order{payout.orderCount === 1 ? "" : "s"} · {new Date(payout.paidAt).toLocaleString()}
                        </Text>
                        {payout.paidReference ? (
                          <Text style={styles.payoutHistoryRef}>Ref: {payout.paidReference}</Text>
                        ) : null}
                      </View>
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidBadgeText}>PAID</Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
              {withdrawalWallet?.withdrawalHistory?.length ? (
                <>
                  <Text style={styles.historySectionTitle}>Withdrawal requests</Text>
                  {withdrawalWallet.withdrawalHistory.map((entry) => (
                    <View key={entry._id} style={styles.payoutHistoryItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.payoutHistoryAmount}>{formatCurrency(entry.amount)}</Text>
                        <Text style={styles.payoutHistoryMeta}>
                          {new Date(entry.createdAt).toLocaleString()}
                          {entry.reviewedAt ? ` · Reviewed ${new Date(entry.reviewedAt).toLocaleDateString()}` : ""}
                        </Text>
                        {entry.rejectionReason ? (
                          <Text style={styles.rejectionText}>{entry.rejectionReason}</Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          entry.status === "PAID" && styles.statusBadgePaid,
                          entry.status === "PENDING" && styles.statusBadgePending,
                          entry.status === "REJECTED" && styles.statusBadgeRejected
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>{entry.status}</Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
              {!withdrawalWallet?.payouts?.length && !withdrawalWallet?.withdrawalHistory?.length ? (
                <View style={styles.emptyEarningsBox}>
                  <Ionicons name="wallet-outline" size={24} color="#9CA3AF" />
                  <Text style={styles.emptyEarningsText}>No payout history yet.</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeAreaScreen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  todayCard: {
    backgroundColor: '#4CAF50',
    padding: 24,
    margin: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  todayLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 1,
  },
  todayAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  walletSubtext: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.92)',
    marginBottom: 16,
  },
  todayStats: {
    flexDirection: 'column',
    gap: 10,
  },
  todayStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  todayStatText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statHint: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  breakdownIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  breakdownTextContainer: {
    flex: 1,
  },
  breakdownText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  totalEarningsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalEarningsLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  totalEarningsAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  recentDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  recentDeliveries: {
    fontSize: 12,
    color: '#666',
  },
  recentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyEarningsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyEarningsText: {
    fontSize: 13,
    color: '#6B7280',
  },
  withdrawalCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cashCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cashCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cashRefreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  withdrawalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  withdrawalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  withdrawalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  cashAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 8,
  },
  withdrawalNote: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  withdrawButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  depositButton: {
    backgroundColor: '#B45309',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cashSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  cashSummaryLabel: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  cashSummaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  ledgerSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  ledgerSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  ledgerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ledgerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  ledgerMeta: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
  ledgerAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  ledgerAmountNegative: {
    color: '#027A48',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalDismissAreaCompact: {
    flex: 0,
    minHeight: 28,
  },
  modalSheetWrap: {
    width: "100%",
  },
  depositModalScroll: {
    paddingBottom: 8,
  },
  depositModal: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  modalBalanceHint: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 12,
  },
  useFullBalanceButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  useFullBalanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  modalTextarea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#B45309',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  pendingWithdrawalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  pendingWithdrawalText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  paidWithdrawalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  paidWithdrawalText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
  bankHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 17,
  },
  bankHintWarning: {
    fontSize: 12,
    color: '#B45309',
    marginBottom: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  viewPayoutHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
  },
  viewPayoutHistoryText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  payoutHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  payoutHistoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  payoutHistoryMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  payoutHistoryRef: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
  },
  statusBadgePaid: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  rejectionText: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  proofLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  proofUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: '#FFF7ED',
  },
  proofUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B45309',
  },
  proofPreview: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
});