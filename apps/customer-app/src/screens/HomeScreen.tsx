import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ADD THIS
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import apiClient from '../api/client';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Shop {
  _id: string;
  shopName: string;
  category: string;
  address: string;
  isOpen: boolean;
  rating: number;
}

interface ApiResponse {
  success: boolean;
  data: Shop[];
}

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNearbyShops();
  }, []);

  const loadNearbyShops = async () => {
    try {
      setLoading(true);
      console.log('📱 Fetching nearby shops...');
      
      // Debug: Check token
      const token = await AsyncStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      
      const response: any = await apiClient.get('/users/nearby-shops');
      console.log('📦 API Response:', response);
      
      let shopsData: Shop[] = [];
      
      if (response && Array.isArray(response.data)) {
        shopsData = response.data;
      } else if (response && response.success && Array.isArray(response.data)) {
        shopsData = response.data;
      }
      
      console.log('🛍️ Shops loaded:', shopsData.length);
      setShops(shopsData);
      
    } catch (error: any) {
      console.error('❌ API Error:', error.message);
      Alert.alert('Error', error.message || 'Failed to load shops');
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  const renderShopItem = ({ item }: { item: Shop }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => navigation.navigate('ShopDetail', { shopId: item._id })} // Change th
    >
      <View style={styles.shopHeader}>
        <Text style={styles.shopName}>{item.shopName}</Text>
        <View style={[styles.statusDot, item.isOpen ? styles.open : styles.closed]}>
          <Text style={styles.statusText}>{item.isOpen ? 'Open' : 'Closed'}</Text>
        </View>
      </View>
      <Text style={styles.shopCategory}>{item.category}</Text>
      <Text style={styles.shopAddress}>{item.address}</Text>
      <Text style={styles.shopRating}>⭐ {item.rating?.toFixed(1) || '0.0'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text>Loading nearby shops...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NearU</Text>
        <Text style={styles.subtitle}>Local shops near you</Text>
      </View>

      {shops.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text>No shops found in your area</Text>
          <TouchableOpacity onPress={loadNearbyShops} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={shops}
          renderItem={renderShopItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#FF6B35',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  list: {
    padding: 16,
  },
  shopCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusDot: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  open: {
    backgroundColor: '#4CAF50',
  },
  closed: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  shopCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  shopAddress: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  shopRating: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});