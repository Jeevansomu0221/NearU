import React, { useState, useEffect } from "react";
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
  TextInput
} from "react-native";
import {
  getCashLedger,
  getDeliveryStats,
  getMyDeliveryOrders,
  getTodaysEarnings,
  getWithdrawalWallet,
  requestWithdrawal,
  submitCashDeposit,
  type CashLedgerSummary,
  type DeliveryOrder,
  type WithdrawalWallet
} from "../api/delivery.api";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [cashLedger, setCashLedger] = useState<CashLedgerSummary | null>(null);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositReference, setDepositReference] = useState("");
  const [depositProofUrl, setDepositProofUrl] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [earningsHistory, setEarningsHistory] = useState<EarningHistoryItem[]>([]);
  const [earningsModalVisible, setEarningsModalVisible] = useState(false);
  const [withdrawalWallet, setWithdrawalWallet] = useState<WithdrawalWallet | null>(null);
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);
  const [payoutHistoryVisible, setPayoutHistoryVisible] = useState(false);

  useEffect(() => {
    loadEarningsData();
  }, [selectedPeriod]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      
      // Load today's earnings
      const todayResponse = await getTodaysEarnings();
      if (todayResponse.success && todayResponse.data) {
        setTodayEarnings(todayResponse.data.earnings);
      }
      
      // Load overall stats
      const statsResponse = await getDeliveryStats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
        setTodayEarnings(statsResponse.data.todaysEarnings ?? todayEarnings);
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

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
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
        return {
          id: order._id,
          date: Number.isNaN(deliveredAt) ? "Delivered" : formatEarningDate(deliveredAt),
          orderLabel: order.isBundledDelivery ? `Bundled #${order._id.slice(-6).toUpperCase()}` : `Order #${order._id.slice(-6).toUpperCase()}`,
          amount: Number(order.deliveryEarnings || order.estimatedEarnings || order.deliveryFee || 0),
          deliveries,
          deliveredAt: Number.isNaN(deliveredAt) ? 0 : deliveredAt
        };
      })
      .sort((left, right) => right.deliveredAt - left.deliveredAt);

  const handleSubmitDeposit = async () => {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Enter the amount you deposited back to the platform.");
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

      Alert.alert("Submitted", "Your cash deposit is waiting for admin verification.");
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
    if (!withdrawalWallet?.hasBankDetails) {
      Alert.alert(
        "Bank details required",
        "Add your bank account or UPI ID in Profile before requesting a withdrawal.",
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
          ? "Your COD cash balance offsets your earnings. Deposit cash back before withdrawing."
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
        {/* Today's Earnings Card */}
        <View style={styles.todayCard}>
        <Text style={styles.todayLabel}>TODAY'S EARNINGS</Text>
        <Text style={styles.todayAmount}>{formatCurrency(todayEarnings)}</Text>
        <View style={styles.todayStats}>
          <View style={styles.todayStatItem}>
            <Ionicons name="bicycle" size={16} color="#4CAF50" />
            <Text style={styles.todayStatText}>
              {stats?.todaysDeliveries || 0} deliveries
            </Text>
          </View>
          <View style={styles.todayStatItem}>
            <Ionicons name="time" size={16} color="#4CAF50" />
            <Text style={styles.todayStatText}>
              {stats?.averageDeliveryTime || 0} min avg
            </Text>
          </View>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'today' && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod('today')}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === 'today' && styles.periodButtonTextActive
          ]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'week' && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod('week')}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === 'week' && styles.periodButtonTextActive
          ]}>
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'month' && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod('month')}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === 'month' && styles.periodButtonTextActive
          ]}>
            This Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overall Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="cash" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.statValue}>
            {formatCurrency(stats?.totalEarnings || 0)}
          </Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
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
        <View style={styles.withdrawalHeader}>
          <Ionicons name="wallet-outline" size={24} color="#B45309" />
          <Text style={styles.withdrawalTitle}>COD Cash Balance</Text>
        </View>
        <Text style={styles.cashAmount}>{formatCurrency(cashLedger?.cashBalance || stats?.cashBalance || 0)}</Text>
        <Text style={styles.withdrawalNote}>
          Cash collected from COD orders is adjusted against your rider earnings first. Any remaining amount must be deposited back to the platform.
        </Text>
        <View style={styles.cashSummaryRow}>
          <Text style={styles.cashSummaryLabel}>Pending deposit verification</Text>
          <Text style={styles.cashSummaryValue}>
            {formatCurrency(cashLedger?.pendingDepositAmount || stats?.pendingDepositAmount || 0)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.depositButton, (cashLedger?.cashBalance || stats?.cashBalance || 0) <= 0 && styles.disabledButton]}
          disabled={(cashLedger?.cashBalance || stats?.cashBalance || 0) <= 0}
          onPress={() => setDepositModalVisible(true)}
        >
          <Text style={styles.withdrawButtonText}>Submit Cash Deposit</Text>
        </TouchableOpacity>
        {cashLedger?.entries?.slice(0, 3).map((entry) => (
          <View key={entry._id} style={styles.ledgerItem}>
            <View>
              <Text style={styles.ledgerTitle}>{entry.type.replace(/_/g, " ")}</Text>
              <Text style={styles.ledgerMeta}>{new Date(entry.createdAt).toLocaleString()} · {entry.status}</Text>
            </View>
            <Text style={[styles.ledgerAmount, entry.balanceDelta < 0 && styles.ledgerAmountNegative]}>
              {entry.balanceDelta < 0 ? "-" : "+"}{formatCurrency(Math.abs(entry.balanceDelta || entry.amount))}
            </Text>
          </View>
        ))}
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Earnings Breakdown</Text>
        
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownIconContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          </View>
          <View style={styles.breakdownTextContainer}>
            <Text style={styles.breakdownText}>Delivery Fees</Text>
            <Text style={styles.breakdownAmount}>{formatCurrency(todayEarnings)}</Text>
          </View>
        </View>
        
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownIconContainer}>
            <Ionicons name="star" size={20} color="#FFD700" />
          </View>
          <View style={styles.breakdownTextContainer}>
            <Text style={styles.breakdownText}>Tips Received</Text>
            <Text style={styles.breakdownAmount}>₹0</Text>
          </View>
        </View>
        
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownIconContainer}>
            <Ionicons name="trophy" size={20} color="#FF9800" />
          </View>
          <View style={styles.breakdownTextContainer}>
            <Text style={styles.breakdownText}>Bonus Earnings</Text>
            <Text style={styles.breakdownAmount}>₹0</Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.totalEarningsItem}>
          <Text style={styles.totalEarningsLabel}>Total Earnings</Text>
          <Text style={styles.totalEarningsAmount}>
            {formatCurrency(todayEarnings)}
          </Text>
        </View>
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

      {/* Withdrawal Info */}
      <View style={styles.withdrawalCard}>
        <View style={styles.withdrawalHeader}>
          <Ionicons name="wallet" size={24} color="#4CAF50" />
          <Text style={styles.withdrawalTitle}>Available Balance</Text>
        </View>
        <Text style={styles.withdrawalAmount}>
          {formatCurrency(withdrawalWallet?.availableBalance ?? 0)}
        </Text>
        {withdrawalWallet?.pendingRequest ? (
          <View style={styles.pendingWithdrawalBanner}>
            <Ionicons name="time-outline" size={16} color="#B45309" />
            <Text style={styles.pendingWithdrawalText}>
              {formatCurrency(withdrawalWallet.pendingRequest.amount)} withdrawal pending admin approval
            </Text>
          </View>
        ) : null}
        <Text style={styles.withdrawalNote}>
          {withdrawalWallet?.pendingPayoutOrderCount
            ? `${withdrawalWallet.pendingPayoutOrderCount} delivered order${withdrawalWallet.pendingPayoutOrderCount === 1 ? "" : "s"} pending payout`
            : "Complete deliveries to earn withdrawable balance"}
          {withdrawalWallet?.cashOffset
            ? ` · ₹${withdrawalWallet.cashOffset.toLocaleString("en-IN")} COD cash offset applied`
            : ""}
        </Text>
        {withdrawalWallet?.hasBankDetails ? (
          <Text style={styles.bankHint}>
            Payout to {withdrawalWallet.bankDetails.accountHolderName || "your account"}
            {withdrawalWallet.bankDetails.upiId
              ? ` · UPI ${withdrawalWallet.bankDetails.upiId}`
              : withdrawalWallet.bankDetails.maskedAccountNumber
                ? ` · ${withdrawalWallet.bankDetails.maskedAccountNumber}`
                : ""}
          </Text>
        ) : (
          <Text style={styles.bankHintWarning}>Add bank or UPI details in Profile to withdraw earnings.</Text>
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
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.depositModal}>
            <Text style={styles.modalTitle}>Submit Cash Deposit</Text>
            <Text style={styles.modalDescription}>
              Enter details after depositing COD cash back to the platform. Admin will verify before your balance is reduced.
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Amount"
              placeholderTextColor="#6B7280"
              value={depositAmount}
              onChangeText={setDepositAmount}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Reference / UTR"
              placeholderTextColor="#6B7280"
              value={depositReference}
              onChangeText={setDepositReference}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Proof URL (optional)"
              placeholderTextColor="#6B7280"
              value={depositProofUrl}
              onChangeText={setDepositProofUrl}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              placeholder="Note (optional)"
              placeholderTextColor="#6B7280"
              multiline
              value={depositNote}
              onChangeText={setDepositNote}
            />
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
    marginBottom: 16,
  },
  todayStats: {
    flexDirection: 'row',
    gap: 20,
  },
  todayStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayStatText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
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
  depositModal: {
    backgroundColor: '#FFFFFF',
    padding: 20,
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
    marginBottom: 16,
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
});