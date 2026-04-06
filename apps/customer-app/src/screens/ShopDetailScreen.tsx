import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Shop } from "../navigation/AppNavigator";
import { getPartnerMenu } from "../api/menu.api";
import { useCart } from "../context/CartContext";

type ShopDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, "ShopDetail">;

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
  const [shop] = useState<Shop | null>(passedShop || null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, getItemCount } = useCart();

  const loadMenu = async () => {
    try {
      setLoading(true);
      const res: any = await getPartnerMenu(shopId);
      if (res.data && Array.isArray(res.data)) {
        setMenu(res.data.filter((item: MenuItem) => item.isAvailable));
      } else {
        setMenu([]);
      }
    } catch (error: any) {
      console.error("Error loading menu:", error);
      Alert.alert("Error", "Failed to load menu");
      setMenu([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, [shopId]);

  const formatAddress = (address: any) => {
    if (!address) return "Address not available";
    if (typeof address === "string") return address;
    return [address.roadStreet, address.colony, address.area, address.city, address.state, address.pincode]
      .filter(Boolean)
      .join(", ");
  };

  const groupedMenu = useMemo(() => {
    const source = new Map<string, MenuItem[]>();
    menu.forEach((item) => {
      const key = item.category?.trim() || "Popular";
      const existing = source.get(key) || [];
      existing.push(item);
      source.set(key, existing);
    });
    return Array.from(source.entries());
  }, [menu]);

  const handleAddToCart = (item: MenuItem) => {
    if (!shop) {
      Alert.alert("Error", "Shop information not available");
      return;
    }

    const shopName = shop.shopName || shop.restaurantName || "Restaurant";

    addItem({
      _id: item._id,
      name: item.name,
      price: item.price,
      quantity: 1,
      shopId: shop._id,
      shopName,
      menuItemId: item._id
    });
  };

  const renderMenuCard = (item: MenuItem) => (
    <View key={item._id} style={styles.menuCard}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.menuImage} resizeMode="cover" />
      ) : (
        <View style={[styles.menuImage, styles.placeholderImage]}>
          <Text style={styles.placeholderEmoji}>🍽️</Text>
        </View>
      )}

      <View style={styles.menuContent}>
        <View style={styles.menuTop}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>Rs {item.price}</Text>
        </View>
        {item.description ? (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : (
          <Text style={styles.itemDescriptionMuted}>Freshly prepared in-store.</Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterNote}>Ready in a few minutes</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => handleAddToCart(item)}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (!shop) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading shop details...</Text>
      </View>
    );
  }

  const shopName = shop.restaurantName || shop.shopName || "Restaurant";
  const category = shop.category || "Food";
  const itemCount = getItemCount();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroArt}>
            {shop.shopImageUrl ? (
              <Image source={{ uri: shop.shopImageUrl }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <Text style={styles.heroPlaceholderEmoji}>🍴</Text>
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <View style={styles.heroHeader}>
              <Text style={styles.shopName}>{shopName}</Text>
              <View style={[styles.statusBadge, shop.isOpen ? styles.openBadge : styles.closedBadge]}>
                <Text style={[styles.statusText, shop.isOpen ? styles.openText : styles.closedText]}>
                  {shop.isOpen ? "Open" : "Closed"}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.categoryPill}>{category}</Text>
              <Text style={styles.rating}>★ {shop.rating?.toFixed(1) || "0.0"}</Text>
            </View>

            <Text style={styles.addressText}>{formatAddress(shop.address)}</Text>

            <Text style={styles.deliveryMeta}>
              {shop.openingTime && shop.closingTime
                ? `${shop.openingTime} - ${shop.closingTime}`
                : "Serving now"}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Menu</Text>
          <Text style={styles.sectionSubtitle}>{menu.length} items available</Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading menu...</Text>
          </View>
        ) : menu.length === 0 ? (
          <View style={styles.emptyMenu}>
            <Text style={styles.emptyMenuTitle}>Menu coming soon</Text>
            <Text style={styles.emptyMenuText}>This shop has not added any available items yet.</Text>
          </View>
        ) : (
          groupedMenu.map(([section, items]) => (
            <View key={section} style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>{section}</Text>
              {items.map(renderMenuCard)}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Cart</Text>
          <Text style={styles.footerValue}>{itemCount} item{itemCount === 1 ? "" : "s"}</Text>
        </View>

        <TouchableOpacity
          style={styles.viewCartButton}
          onPress={() => navigation.navigate("Cart")}
        >
          <Text style={styles.viewCartButtonText}>View Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3EE"
  },
  content: {
    paddingBottom: 120
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6F6259"
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE5DA",
    overflow: "hidden"
  },
  heroArt: {
    height: 210,
    backgroundColor: "#FFF1EA"
  },
  heroImage: {
    width: "100%",
    height: "100%"
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35"
  },
  heroPlaceholderEmoji: {
    fontSize: 48
  },
  heroInfo: {
    padding: 18
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10
  },
  shopName: {
    flex: 1,
    fontSize: 28,
    fontWeight: "800",
    color: "#2C2018",
    marginRight: 12
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  openBadge: {
    backgroundColor: "#DDF8E5"
  },
  closedBadge: {
    backgroundColor: "#FDE1E1"
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800"
  },
  openText: {
    color: "#216E39"
  },
  closedText: {
    color: "#B42318"
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  categoryPill: {
    backgroundColor: "#F8EFE7",
    color: "#7A5640",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden"
  },
  rating: {
    fontSize: 16,
    fontWeight: "800",
    color: "#E29A13"
  },
  addressText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6F6259",
    marginBottom: 8
  },
  deliveryMeta: {
    fontSize: 13,
    fontWeight: "700",
    color: "#50745E"
  },
  sectionHeader: {
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 6
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2C2018"
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#7B6D63"
  },
  menuSection: {
    marginTop: 12,
    marginHorizontal: 16
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#5C4638",
    marginBottom: 10
  },
  menuCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 12,
    marginBottom: 12,
    alignItems: "flex-start"
  },
  menuImage: {
    width: 82,
    height: 82,
    borderRadius: 16,
    marginRight: 12
  },
  placeholderImage: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE4D7"
  },
  placeholderEmoji: {
    fontSize: 28
  },
  menuContent: {
    flex: 1,
    minHeight: 82,
    justifyContent: "space-between"
  },
  menuTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6
  },
  itemName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#2C2018",
    marginRight: 8
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FF6B35"
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: "#72645A",
    marginBottom: 10
  },
  itemDescriptionMuted: {
    fontSize: 13,
    color: "#9C8E84",
    marginBottom: 10
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2
  },
  cardFooterNote: {
    fontSize: 11,
    color: "#8C7C71",
    fontWeight: "600",
    marginRight: 10
  },
  addButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  emptyMenu: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 28,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE5DA",
    alignItems: "center"
  },
  emptyMenuTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 8
  },
  emptyMenuText: {
    fontSize: 14,
    color: "#7B6D63",
    textAlign: "center",
    lineHeight: 20
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "rgba(247, 243, 238, 0.98)",
    borderTopWidth: 1,
    borderTopColor: "#E8DDD2"
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A7A70"
  },
  footerValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2C2018",
    marginTop: 2
  },
  viewCartButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6
  },
  viewCartButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  }
});
