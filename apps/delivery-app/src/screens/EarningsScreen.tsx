import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from "react-native";
import { getDeliveryStats, getTodaysEarnings } from "../api/delivery.api";
import { Ionicons } from "@expo/vector-icons";

export default function EarningsScreen({ navigation }: any) {
  const [stats, setStats] = useState<any>(null);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

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
      }
    } catch (error: any) {
      console.error("Error loading earnings:", error);
      Alert.alert("Error", "Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const earningsHistory = [
    { id: '1', date: 'Today', amount: todayEarnings, deliveries: 3 },
    { id: '2', date: 'Yesterday', amount: 450, deliveries: 2 },
    { id: '3', date: '2 days ago', amount: 600, deliveries: 3 },
    { id: '4', date: '3 days ago', amount: 350, deliveries: 1 },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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
            <Text style={styles.breakdownAmount}>₹120</Text>
          </View>
        </View>
        
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownIconContainer}>
            <Ionicons name="trophy" size={20} color="#FF9800" />
          </View>
          <View style={styles.breakdownTextContainer}>
            <Text style={styles.breakdownText}>Bonus Earnings</Text>
            <Text style={styles.breakdownAmount}>₹80</Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.totalEarningsItem}>
          <Text style={styles.totalEarningsLabel}>Total Earnings</Text>
          <Text style={styles.totalEarningsAmount}>
            {formatCurrency(todayEarnings + 120 + 80)}
          </Text>
        </View>
      </View>

      {/* Recent Earnings */}
      <View style={styles.recentCard}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent Earnings</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {earningsHistory.map((item) => (
          <View key={item.id} style={styles.recentItem}>
            <View>
              <Text style={styles.recentDate}>{item.date}</Text>
              <Text style={styles.recentDeliveries}>{item.deliveries} deliveries</Text>
            </View>
            <Text style={styles.recentAmount}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}
      </View>

      {/* Withdrawal Info */}
      <View style={styles.withdrawalCard}>
        <View style={styles.withdrawalHeader}>
          <Ionicons name="wallet" size={24} color="#4CAF50" />
          <Text style={styles.withdrawalTitle}>Available Balance</Text>
        </View>
        <Text style={styles.withdrawalAmount}>{formatCurrency(todayEarnings + 1250)}</Text>
        <Text style={styles.withdrawalNote}>
          You can withdraw your earnings every Monday
        </Text>
        <TouchableOpacity style={styles.withdrawButton}>
          <Text style={styles.withdrawButtonText}>Withdraw Earnings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Earnings are updated in real-time after each delivery
        </Text>
      </View>
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
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
});