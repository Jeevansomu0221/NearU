import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getPartnerWallet,
  type PartnerPayoutHistoryItem,
  type PartnerWallet,
  type PartnerWalletOrder
} from "../api/partner.api";
import { usePartnerTheme } from "../context/PartnerThemeContext";
import type { PartnerTheme } from "../theme";

type Props = {
  route?: {
    params?: {
      wallet?: PartnerWallet;
    };
  };
};

const formatMoney = (amount: number) => `Rs ${Math.round(Number(amount || 0)).toLocaleString("en-IN")}`;

const formatDate = (value?: string) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const formatDateTime = (value?: string) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function PaymentHistoryScreen({ route }: Props) {
  const { theme } = usePartnerTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [wallet, setWallet] = useState<PartnerWallet | null>(route?.params?.wallet || null);
  const [loading, setLoading] = useState(!route?.params?.wallet);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!wallet) {
        setLoading(true);
      }
      const response = await getPartnerWallet();
      const responseData = response.data;
      if (responseData.success && responseData.data) {
        setWallet(responseData.data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderPendingPayoutOrder = (order: PartnerWalletOrder) => (
    <View style={styles.historyRow} key={order._id}>
      <View style={styles.historyIcon}>
        <Ionicons name="receipt-outline" size={18} color="#60A5FA" />
      </View>
      <View style={styles.historyCopy}>
        <Text style={styles.historyTitle}>Order #{order._id.slice(-6).toUpperCase()}</Text>
        <Text style={styles.historySub}>Delivered {formatDateTime(order.deliveredAt)}</Text>
      </View>
      <Text style={styles.historyAmount}>{formatMoney(order.amount)}</Text>
    </View>
  );

  const renderPayout = (payout: PartnerPayoutHistoryItem) => (
    <View style={styles.historyRow} key={payout._id}>
      <View style={[styles.historyIcon, styles.paidIcon]}>
        <Ionicons name="checkmark-done-outline" size={18} color="#0E8A4A" />
      </View>
      <View style={styles.historyCopy}>
        <Text style={styles.historyTitle}>Paid to bank</Text>
        <Text style={styles.historySub}>
          {formatDate(payout.periodStart)} - {formatDate(payout.periodEnd)} • {payout.orderCount} orders
        </Text>
        {payout.paidReference ? <Text style={styles.referenceText}>Ref: {payout.paidReference}</Text> : null}
      </View>
      <Text style={styles.historyAmount}>{formatMoney(payout.amount)}</Text>
    </View>
  );

  if (loading && !wallet) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  if (!wallet) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Wallet details unavailable.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadWallet()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 10, paddingBottom: insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadWallet(true)} colors={[theme.colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Wallet balance</Text>
        <Text style={styles.heroAmount}>{formatMoney(wallet.walletBalance)}</Text>
        <Text style={styles.heroSub}>
          {wallet.pendingPayoutOrderCount} paid delivered order
          {wallet.pendingPayoutOrderCount === 1 ? "" : "s"} pending payout
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="calendar-outline" size={20} color="#60A5FA" />
          <Text style={styles.cardTitle}>Next Vyaha payout</Text>
        </View>
        <Text style={styles.nextDate}>{formatDate(wallet.nextPayoutDate)}</Text>
        <Text style={styles.helperText}>{wallet.payoutNote}</Text>

        <View style={styles.bankBox}>
          <Text style={styles.bankLabel}>Bank account</Text>
          {wallet.bankDetails.hasBankDetails ? (
            <>
              <Text style={styles.bankValue}>{wallet.bankDetails.accountHolderName}</Text>
              <Text style={styles.bankSub}>
                {wallet.bankDetails.maskedAccountNumber} • {wallet.bankDetails.ifsc}
              </Text>
            </>
          ) : (
            <Text style={styles.bankSub}>Add bank details in Profile to receive payouts.</Text>
          )}
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Today</Text>
          <Text style={styles.summaryValue}>{formatMoney(wallet.todayEarnings)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Paid till now</Text>
          <Text style={styles.summaryValue}>{formatMoney(wallet.paidTotal)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Orders pending payout</Text>
        {wallet.recentPendingPayoutOrders.length ? (
          wallet.recentPendingPayoutOrders.map(renderPendingPayoutOrder)
        ) : (
          <Text style={styles.emptyText}>No pending payout orders right now.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment history</Text>
        {wallet.payouts.length ? (
          wallet.payouts.map(renderPayout)
        ) : (
          <Text style={styles.emptyText}>No Vyaha payouts have been recorded yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: PartnerTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.muted,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center"
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  retryButtonText: {
    color: theme.colors.card,
    fontSize: 14,
    fontWeight: "800"
  },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    padding: 20
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DDEBFF",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  heroAmount: {
    marginTop: 6,
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  heroSub: {
    marginTop: 6,
    fontSize: 13,
    color: "#EAF3FF",
    fontWeight: "600"
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.primaryDark,
    marginLeft: 8
  },
  nextDate: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.primaryDark
  },
  helperText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.muted,
    fontWeight: "600"
  },
  bankBox: {
    marginTop: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12
  },
  bankLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.muted,
    textTransform: "uppercase",
    marginBottom: 4
  },
  bankValue: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.primaryDark
  },
  bankSub: {
    marginTop: 3,
    fontSize: 13,
    color: theme.colors.muted,
    fontWeight: "600"
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: "800"
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.primaryDark
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft
  },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.neutralSoft,
    marginRight: 10
  },
  paidIcon: {
    backgroundColor: "#E6F7EE"
  },
  historyCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 10
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.primaryDark
  },
  historySub: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: "600"
  },
  referenceText: {
    marginTop: 2,
    fontSize: 11,
    color: "#8AA4C2",
    fontWeight: "700"
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.primaryDark
  },
  emptyText: {
    marginTop: 10,
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600"
  }
});
