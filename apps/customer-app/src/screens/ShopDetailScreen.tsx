import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  Button, 
  FlatList, 
  StyleSheet,
  ScrollView,
  Alert 
} from "react-native";
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Shop } from '../navigation/AppNavigator';
import { getPartnerMenu } from "../api/menu.api";
import { useCart } from "../context/CartContext";

type ShopDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ShopDetail'>;

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  isAvailable: boolean;
  imageUrl?: string;
}

interface Props {
  route: {
    params: {
      shopId: string;
      shop?: Shop;
    };
  };
  navigation: ShopDetailScreenNavigationProp;
}

export default function ShopDetailScreen({ route, navigation }: Props) {
  const { shopId, shop: passedShop } = route.params;
  const [shop, setShop] = useState<Shop | null>(passedShop || null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const { addItem } = useCart();

  const loadMenu = async () => {
    try {
      const res: any = await getPartnerMenu(shopId);
      if (res.data && Array.isArray(res.data)) {
        setMenu(res.data);
      }
    } catch (error: any) {
      console.error("Error loading menu:", error);
      Alert.alert("Error", "Failed to load menu");
    }
  };

  useEffect(() => {
    // If shop wasn't passed, fetch it
    if (!shop && shopId) {
      // You might want to implement a fetchShopDetails API call here
      console.log("Need to fetch shop details for:", shopId);
    }
    loadMenu();
  }, [shopId]);

  const formatAddress = (address: any) => {
    if (!address) return "Address not available";
    
    // Handle both string and object addresses
    if (typeof address === 'string') {
      return address;
    }
    
    if (typeof address === 'object') {
      const parts = [
        address.roadStreet,
        address.colony,
        address.area,
        address.city,
        address.state,
        address.pincode
      ].filter(Boolean);
      
      return parts.join(', ');
    }
    
    return "Address not available";
  };

  const handleAddToCart = (item: MenuItem) => {
    if (!shop) {
      Alert.alert("Error", "Shop information not available");
      return;
    }
    
    // Create cart item without id if CartContext doesn't expect it
    const cartItem = {
      name: item.name,
      price: item.price,
      quantity: 1,
      shopId: shop._id,
      shopName: shop.restaurantName || shop.shopName
    };
    
    addItem(cartItem as any); // Use 'as any' temporarily
    Alert.alert("Added", `${item.name} added to cart`);
  };

  if (!shop) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading shop details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.shopHeader}>
        <Text style={styles.shopName}>{shop.restaurantName || shop.shopName}</Text>
        <Text style={styles.category}>{shop.category}</Text>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, shop.isOpen ? styles.open : styles.closed]} />
          <Text style={styles.statusText}>
            {shop.isOpen ? 'Open Now' : 'Closed'}
          </Text>
        </View>
        
        {shop.rating && (
          <Text style={styles.rating}>⭐ {shop.rating.toFixed(1)}</Text>
        )}
        
        {shop.address && (
          <View style={styles.addressContainer}>
            <Text style={styles.addressTitle}>Address:</Text>
            <Text style={styles.addressText}>{formatAddress(shop.address)}</Text>
          </View>
        )}
      </View>

      <View style={styles.menuContainer}>
        <Text style={styles.menuTitle}>Menu</Text>
        
        {menu.length === 0 ? (
          <Text style={styles.noMenu}>No menu items available</Text>
        ) : (
          <FlatList
            data={menu.filter(item => item.isAvailable)}
            keyExtractor={item => item._id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.menuItem}>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  )}
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                </View>
                <Button
                  title="Add"
                  onPress={() => handleAddToCart(item)}
                />
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="View Cart"
          onPress={() => navigation.navigate("Cart")}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  shopHeader: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  shopName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  category: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  open: {
    backgroundColor: '#4CAF50',
  },
  closed: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  rating: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 12,
  },
  addressContainer: {
    marginTop: 8,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  menuContainer: {
    padding: 16,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  noMenu: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
});