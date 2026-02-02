import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image, // ADD THIS
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import apiClient from '../api/client';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface AddressObject {
  state: string;
  city: string;
  pincode: string;
  area: string;
  colony: string;
  roadStreet: string;
  nearbyPlaces: string[];
  googleMapsLink: string;
}

interface Shop {
  _id: string;
  shopName: string;
  restaurantName?: string;
  category: string;
  address: string | AddressObject;
  isOpen: boolean;
  rating: number;
  shopImageUrl?: string; // ADD THIS
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
    
    const response: any = await apiClient.get('/users/shops');
    console.log('📦 FULL API Response:', JSON.stringify(response, null, 2)); // ADD THIS
    
    let shopsData: Shop[] = [];
    
    if (response && Array.isArray(response.data)) {
      shopsData = response.data;
    } else if (response && response.success && Array.isArray(response.data)) {
      shopsData = response.data;
    }
    
    console.log('🛍️ Shops loaded:', shopsData.length);
    // Debug each shop
    shopsData.forEach((shop: any, index: number) => {
      console.log(`Shop ${index}:`, JSON.stringify(shop, null, 2)); // ADD THIS
    });
    setShops(shopsData);
    
  } catch (error: any) {
    console.error('❌ API Error:', error);
    Alert.alert('Error', error.message || 'Failed to load shops');
    setShops([]);
  } finally {
    setLoading(false);
  }
};

  const formatAddress = (address: string | AddressObject): string => {
    if (!address) return "Address not available";
    
    if (typeof address === 'string') {
      return address;
    }
    
    if (typeof address === 'object') {
      const addr = address as AddressObject;
      const parts = [
        addr.roadStreet,
        addr.colony,
        addr.area,
        addr.city
      ].filter(Boolean);
      
      return parts.join(', ');
    }
    
    return "Address not available";
  };

  const renderShopItem = ({ item }: { item: Shop }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => navigation.navigate('ShopDetail', { 
        shopId: item._id,
        shop: item 
      })}
    >
      <View style={styles.shopCardContent}>
        {/* Shop Image */}
        {item.shopImageUrl ? (
          <Image 
            source={{ uri: item.shopImageUrl }} 
            style={styles.shopImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.shopImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        
        <View style={styles.shopInfo}>
          <View style={styles.shopHeader}>
            <Text style={styles.shopName} numberOfLines={1}>
              {item.shopName || item.restaurantName}
            </Text>
            <View style={[styles.statusDot, item.isOpen ? styles.open : styles.closed]}>
              <Text style={styles.statusText}>{item.isOpen ? 'Open' : 'Closed'}</Text>
            </View>
          </View>
          
          <Text style={styles.shopCategory}>{item.category}</Text>
          
          <Text style={styles.shopAddress} numberOfLines={1}>
            {formatAddress(item.address)}
          </Text>
          
          <View style={styles.ratingContainer}>
            <Text style={styles.shopRating}>⭐ {item.rating?.toFixed(1) || '0.0'}</Text>
          </View>
        </View>
      </View>
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  shopCardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  shopImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#888',
    fontSize: 11,
  },
  shopInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusDot: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  open: {
    backgroundColor: '#4CAF50',
  },
  closed: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
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
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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