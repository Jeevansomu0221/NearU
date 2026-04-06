import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getPartners } from "../api/menu.api";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface AddressObject {
  state?: string;
  city?: string;
  pincode?: string;
  area?: string;
  colony?: string;
  roadStreet?: string;
}

interface Shop {
  _id: string;
  shopName: string;
  restaurantName?: string;
  category: string;
  address: string | AddressObject;
  isOpen: boolean;
  rating: number;
  shopImageUrl?: string;
  openingTime?: string;
  closingTime?: string;
}

interface Props {
  navigation: HomeScreenNavigationProp;
}

const categoryLabels: Record<string, string> = {
  all: "All",
  bakery: "Bakery",
  "tiffin-center": "Tiffin",
  sweets: "Sweets",
  "fast-food": "Fast Food",
  "mini-restaurant": "Mini Restaurant",
  "ice-creams": "Ice Creams",
  other: "Local Shop"
};

const filterOptions = [
  { key: "all", label: "All" },
  { key: "tiffin-center", label: "Tiffins" },
  { key: "mini-restaurant", label: "Restaurant" },
  { key: "bakery", label: "Bakery" },
  { key: "fast-food", label: "Fast Food" },
  { key: "sweets", label: "Sweets" }
];

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");

  useEffect(() => {
    loadNearbyShops();
  }, []);

  const loadNearbyShops = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await getPartners();

      if (response?.success && Array.isArray(response.data)) {
        setShops(response.data);
      } else if (Array.isArray((response as any)?.data)) {
        setShops((response as any).data);
      } else {
        setShops([]);
      }
    } catch (error: any) {
      console.error("HomeScreen load error:", error);
      Alert.alert("Error", error.message || "Failed to load shops");
      setShops([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatAddress = (address: string | AddressObject): string => {
    if (!address) return "Address not available";
    if (typeof address === "string") return address;
    return [address.roadStreet, address.colony, address.area, address.city].filter(Boolean).join(", ");
  };

  const getCategoryEmoji = (category: string) => {
    const value = (category || "").toLowerCase();
    if (value.includes("bakery")) return "🥐";
    if (value.includes("tiffin")) return "🍽";
    if (value.includes("sweet")) return "🧁";
    if (value.includes("ice")) return "🍨";
    if (value.includes("fast")) return "🍔";
    return "🏪";
  };

  const renderHeader = () => (
    <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>NearU Food</Text>
        <Text style={styles.heroTitle}>Local shops near you</Text>
        <Text style={styles.heroSubtitle}>Fresh nearby favorites with fast menu browsing.</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{shops.length}</Text>
          <Text style={styles.metricLabel}>Total Shops</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{shops.filter((shop) => shop.isOpen).length}</Text>
          <Text style={styles.metricLabel}>Open Now</Text>
        </View>
      </View>

      <FlatList
        data={filterOptions}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filtersRow}
        renderItem={({ item }) => {
          const active = selectedFilter === item.key;
          return (
            <TouchableOpacity
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSelectedFilter(item.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const renderShopItem = ({ item }: { item: Shop }) => {
    const displayName = item.shopName || item.restaurantName || "Local Shop";
    const address = formatAddress(item.address);
    const category = categoryLabels[item.category] || item.category;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.shopCard}
        onPress={() =>
          navigation.navigate("ShopDetail", {
            shopId: item._id,
            shop: item
          })
        }
      >
        <View style={styles.thumbWrap}>
          {item.shopImageUrl ? (
            <Image source={{ uri: item.shopImageUrl }} style={styles.shopImage} resizeMode="cover" />
          ) : (
            <View style={[styles.shopImage, styles.placeholderImage]}>
              <Text style={styles.placeholderEmoji}>{getCategoryEmoji(item.category)}</Text>
            </View>
          )}
        </View>

        <View style={styles.shopInfo}>
          <View style={styles.topRow}>
            <Text style={styles.shopName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.viewMenu}>View Menu</Text>
          </View>

          <View style={styles.middleRow}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {category}
            </Text>
            <View style={[styles.statusBadge, item.isOpen ? styles.openBadge : styles.closedBadge]}>
              <Text style={[styles.statusText, item.isOpen ? styles.openText : styles.closedText]}>
                {item.isOpen ? "Open" : "Closed"}
              </Text>
            </View>
          </View>

          <Text style={styles.addressText} numberOfLines={1}>
            {address || "Address not available"}
          </Text>

          <View style={styles.bottomRow}>
            <Text style={styles.ratingText}>★ {item.rating?.toFixed(1) || "0.0"}</Text>
            <Text style={styles.timeText} numberOfLines={1}>
              {item.openingTime && item.closingTime ? `${item.openingTime} - ${item.closingTime}` : "Available now"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No shops found right now</Text>
      <Text style={styles.emptyText}>Pull down to refresh or try again in a moment.</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading nearby shops...</Text>
      </View>
    );
  }

  const filteredShops =
    selectedFilter === "all" ? shops : shops.filter((shop) => shop.category === selectedFilter);

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredShops}
        keyExtractor={(item) => item._id}
        renderItem={renderShopItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNearbyShops(true)} tintColor="#FF6B35" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3EE"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F3EE"
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6B5E55"
  },
  listContent: {
    paddingBottom: 18
  },
  headerWrap: {
    paddingBottom: 8
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: "#FF6B35"
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFE5DA",
    marginBottom: 6
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: "#FFF3ED"
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE5DA",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 2
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B6A54"
  },
  filtersRow: {
    paddingHorizontal: 16,
    paddingBottom: 4
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE5DA",
    marginRight: 8
  },
  filterChipActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35"
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6F6259"
  },
  filterChipTextActive: {
    color: "#FFFFFF"
  },
  shopCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE5DA",
    flexDirection: "row",
    alignItems: "center"
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    marginRight: 10,
    backgroundColor: "#FFF2EB"
  },
  shopImage: {
    width: "100%",
    height: "100%"
  },
  placeholderImage: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35"
  },
  placeholderEmoji: {
    fontSize: 26
  },
  shopInfo: {
    flex: 1
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3
  },
  shopName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#2C2018",
    marginRight: 8
  },
  viewMenu: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FF6B35"
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3
  },
  categoryText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#8B6A54",
    marginRight: 8
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  openBadge: {
    backgroundColor: "#DDF8E5"
  },
  closedBadge: {
    backgroundColor: "#FDE1E1"
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800"
  },
  openText: {
    color: "#216E39"
  },
  closedText: {
    color: "#B42318"
  },
  addressText: {
    fontSize: 10,
    color: "#7B6D63",
    marginBottom: 4
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E29A13"
  },
  timeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#5C7C66",
    marginLeft: 8
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 24,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE5DA",
    alignItems: "center"
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 6
  },
  emptyText: {
    fontSize: 13,
    color: "#7B6D63",
    textAlign: "center",
    lineHeight: 18
  }
});
