import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getPartners } from "../api/menu.api";
import { useCart } from "../context/CartContext";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface AddressObject {
  state?: string;
  city?: string;
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
  "tiffin-center": "Tiffins",
  sweets: "Sweets",
  "fast-food": "Fast Food",
  "mini-restaurant": "Restaurant",
  "ice-creams": "Ice Creams",
  other: "Local Shop"
};

const filterOptions = [
  { key: "all", label: "All", icon: "view-grid-outline" },
  { key: "tiffin-center", label: "Tiffins", icon: "food-outline" },
  { key: "mini-restaurant", label: "Restaurant", icon: "silverware-fork-knife" },
  { key: "bakery", label: "Bakery", icon: "cupcake-outline" },
  { key: "fast-food", label: "Fast Food", icon: "hamburger" }
];

const shopPlaceholders: Record<string, string> = {
  bakery:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=240&q=80",
  "tiffin-center":
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=240&q=80",
  "mini-restaurant":
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=240&q=80",
  "fast-food":
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=240&q=80",
  sweets:
    "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=240&q=80"
};

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { getItemCount } = useCart();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredShops = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return shops.filter((shop) => {
      const matchesFilter = selectedFilter === "all" || shop.category === selectedFilter;
      if (!matchesFilter) return false;

      if (!normalizedQuery) return true;

      const haystack = [
        shop.shopName,
        shop.restaurantName,
        categoryLabels[shop.category],
        formatAddress(shop.address)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [searchQuery, selectedFilter, shops]);

  const openNowCount = shops.filter((shop) => shop.isOpen).length;

  const renderHeroArt = () => (
    <View style={styles.heroArt}>
      <View style={styles.heroGlow} />
      <View style={styles.heroHill} />
      <View style={styles.heroLeafLeft} />
      <View style={styles.heroLeafRight} />
      <View style={styles.storeMarker}>
        <View style={styles.storeMarkerDot} />
      </View>
      <View style={styles.storeWrap}>
        <View style={styles.storeRoof} />
        <View style={styles.storeBody}>
          <View style={styles.storeWindowLarge} />
          <View style={styles.storeWindowSmall} />
        </View>
      </View>
      <MaterialCommunityIcons name="hamburger" size={42} color="#F19947" style={styles.burgerIcon} />
      <MaterialCommunityIcons name="noodles" size={38} color="#F29E59" style={styles.bowlIcon} />
      <MaterialCommunityIcons name="cup-outline" size={34} color="#F1B17A" style={styles.drinkIcon} />
    </View>
  );

  const renderHeader = () => (
    <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.heroRow}>
        <View style={styles.heroTextBlock}>
          <Text style={styles.brandText}>Vyaha Food</Text>
          <Text style={styles.heading}>Local shops</Text>
          <Text style={styles.heading}>near you</Text>
          <Text style={styles.subheading}>Explore different kinds of food near you.</Text>
        </View>

        <View style={styles.heroRight}>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate("Profile")}>
              <Feather name="user" size={16} color="#FF6B35" />
              <Text style={styles.quickActionText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate("Cart")}>
              <View style={styles.quickBadgeWrap}>
                <Feather name="shopping-bag" size={16} color="#FF6B35" />
                {getItemCount() > 0 ? (
                  <View style={styles.quickBadge}>
                    <Text style={styles.quickBadgeText}>{getItemCount()}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.quickActionText}>Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate("Orders")}>
              <Feather name="clipboard" size={16} color="#FF6B35" />
              <Text style={styles.quickActionText}>Orders</Text>
            </TouchableOpacity>
          </View>
          {renderHeroArt()}
        </View>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color="#7F756E" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search for shops, food or cuisines..."
          placeholderTextColor="#A0958D"
        />
        <TouchableOpacity
          style={styles.searchFilterButton}
          onPress={() => Alert.alert("Filters", "Advanced sorting and filters can be added next.")}
        >
          <Feather name="sliders" size={16} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardWarm]}>
          <View style={styles.statIconCircle}>
            <MaterialCommunityIcons name="view-grid-outline" size={16} color="#FF6B35" />
          </View>
          <View style={styles.statTextWrap}>
            <Text style={styles.statValue}>{shops.length}</Text>
            <Text style={styles.statLabel}>Shops</Text>
          </View>
          <MaterialCommunityIcons name="storefront-outline" size={36} color="#F7DCC7" style={styles.statArt} />
        </View>

        <View style={[styles.statCard, styles.statCardCool]}>
          <View style={[styles.statIconCircle, styles.statIconCircleCool]}>
            <Feather name="clock" size={16} color="#2B9C4A" />
          </View>
          <View style={styles.statTextWrap}>
            <Text style={styles.statValue}>{openNowCount}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <MaterialCommunityIcons name="store-outline" size={36} color="#CDEECE" style={styles.statArt} />
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
              <MaterialCommunityIcons
                name={item.icon as any}
                size={15}
                color={active ? "#FFFFFF" : "#605750"}
                style={styles.filterChipIcon}
              />
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const renderShopItem = ({ item }: { item: Shop }) => {
    const displayName = item.shopName || item.restaurantName || "Local Shop";
    const category = categoryLabels[item.category] || item.category;
    const address = formatAddress(item.address) || "Address not available";
    const imageUrl = item.shopImageUrl || shopPlaceholders[item.category] || shopPlaceholders["mini-restaurant"];

    return (
      <TouchableOpacity
        style={styles.shopCard}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("ShopDetail", {
            shopId: item._id,
            shop: item
          })
        }
      >
        <Image source={{ uri: imageUrl }} style={styles.shopImage} resizeMode="cover" />

        <View style={styles.shopContent}>
          <View style={styles.shopTop}>
            <View style={styles.shopMainInfo}>
              <Text style={styles.shopName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.shopCategory}>{category}</Text>
            </View>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() =>
                navigation.navigate("ShopDetail", {
                  shopId: item._id,
                  shop: item
                })
              }
            >
              <Text style={styles.menuButtonText}>Menu</Text>
              <Feather name="chevron-right" size={14} color="#FF6B35" />
            </TouchableOpacity>
          </View>

          <View style={styles.addressRow}>
            <Feather name="map-pin" size={11} color="#8A7E75" />
            <Text style={styles.shopAddress} numberOfLines={1}>
              {address}
            </Text>
          </View>

          <View style={styles.shopBottom}>
            <View style={styles.ratingRow}>
              <Feather name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{item.rating?.toFixed(1) || "4.0"}</Text>
            </View>

            <View style={styles.shopMetaRight}>
              <View style={[styles.statusPill, !item.isOpen && styles.statusPillClosed]}>
                <Text style={[styles.statusText, !item.isOpen && styles.statusTextClosed]}>
                  {item.isOpen ? "Open" : "Closed"}
                </Text>
              </View>
              <Text style={styles.timeText}>
                {item.openingTime && item.closingTime ? `${item.openingTime} - ${item.closingTime}` : "08:00 - 22:00"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No shops found</Text>
      <Text style={styles.emptyText}>Try another category or adjust your search.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredShops}
        keyExtractor={(item) => item._id}
        renderItem={renderShopItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadNearbyShops(true)} tintColor="#FF6B35" />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBF8F4"
  },
  listContent: {
    paddingBottom: 14
  },
  headerWrap: {
    paddingHorizontal: 14,
    paddingBottom: 6
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  heroTextBlock: {
    flex: 1,
    paddingRight: 10
  },
  brandText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF6B35",
    marginBottom: 6
  },
  heading: {
    fontSize: 21,
    lineHeight: 24,
    fontWeight: "900",
    color: "#1F1813"
  },
  subheading: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: "#6B625A",
    maxWidth: 166
  },
  heroRight: {
    width: 162
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  quickActionCard: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE8DF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E9DDD1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2
  },
  quickActionText: {
    marginTop: 3,
    fontSize: 8,
    fontWeight: "700",
    color: "#554B43"
  },
  quickBadgeWrap: {
    position: "relative"
  },
  quickBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2
  },
  quickBadgeText: {
    fontSize: 7,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  heroArt: {
    height: 98,
    borderRadius: 24,
    backgroundColor: "#FFF5EC",
    overflow: "hidden",
    position: "relative"
  },
  heroGlow: {
    position: "absolute",
    right: -8,
    top: 8,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFE7D2"
  },
  heroHill: {
    position: "absolute",
    left: -10,
    right: -10,
    bottom: -4,
    height: 36,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#FFEBDD"
  },
  heroLeafLeft: {
    position: "absolute",
    left: 16,
    bottom: 12,
    width: 16,
    height: 26,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 2,
    backgroundColor: "#F8D6BA",
    transform: [{ rotate: "-25deg" }]
  },
  heroLeafRight: {
    position: "absolute",
    right: 24,
    bottom: 12,
    width: 16,
    height: 26,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 16,
    backgroundColor: "#F8D6BA",
    transform: [{ rotate: "25deg" }]
  },
  storeMarker: {
    position: "absolute",
    left: 14,
    bottom: 20,
    width: 14,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF9B52",
    alignItems: "center",
    justifyContent: "center"
  },
  storeMarkerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFF6EF"
  },
  storeWrap: {
    position: "absolute",
    left: 52,
    bottom: 18,
    width: 50,
    height: 42
  },
  storeRoof: {
    width: 48,
    height: 16,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: "#FF994A",
    alignSelf: "center"
  },
  storeBody: {
    width: 42,
    height: 24,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "#FFF8F2",
    alignSelf: "center",
    marginTop: -2,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center"
  },
  storeWindowLarge: {
    width: 14,
    height: 10,
    borderRadius: 3,
    backgroundColor: "#FFD4AF"
  },
  storeWindowSmall: {
    width: 8,
    height: 10,
    borderRadius: 3,
    backgroundColor: "#FFD4AF"
  },
  burgerIcon: {
    position: "absolute",
    right: 42,
    bottom: 10
  },
  bowlIcon: {
    position: "absolute",
    right: 6,
    bottom: 10
  },
  drinkIcon: {
    position: "absolute",
    right: -2,
    top: 28
  },
  searchBar: {
    marginTop: 10,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE8E0",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 8
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: "#2A211B",
    paddingVertical: 0
  },
  searchFilterButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFF4EB",
    alignItems: "center",
    justifyContent: "center"
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  statCard: {
    flex: 1,
    height: 76,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start"
  },
  statCardWarm: {
    backgroundColor: "#FFF8F2",
    borderColor: "#F6E3D1"
  },
  statCardCool: {
    backgroundColor: "#F8FFF8",
    borderColor: "#DDEFD8"
  },
  statIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  statIconCircleCool: {
    backgroundColor: "#F0FFF1"
  },
  statTextWrap: {
    marginLeft: 10
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#201914"
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#544C45"
  },
  statArt: {
    position: "absolute",
    right: 10,
    bottom: 6
  },
  filtersRow: {
    paddingTop: 10,
    paddingBottom: 2
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE8E0",
    marginRight: 7
  },
  filterChipActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35"
  },
  filterChipIcon: {
    marginRight: 5
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F4740"
  },
  filterChipTextActive: {
    color: "#FFFFFF"
  },
  shopCard: {
    marginHorizontal: 14,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEE8E0",
    padding: 10,
    flexDirection: "row",
    shadowColor: "#E9DED2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2
  },
  shopImage: {
    width: 74,
    height: 74,
    borderRadius: 14,
    backgroundColor: "#F3E7DA"
  },
  shopContent: {
    flex: 1,
    paddingLeft: 10
  },
  shopTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  shopMainInfo: {
    flex: 1,
    paddingRight: 8
  },
  shopName: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900",
    color: "#201914"
  },
  shopCategory: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "700",
    color: "#FF6B35"
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center"
  },
  menuButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FF6B35",
    marginRight: 1
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5
  },
  shopAddress: {
    flex: 1,
    marginLeft: 4,
    fontSize: 10,
    color: "#7A7168"
  },
  shopBottom: {
    marginTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: "800",
    color: "#D18E18"
  },
  shopMetaRight: {
    alignItems: "flex-end"
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#ECF8EC"
  },
  statusPillClosed: {
    backgroundColor: "#FDE8E8"
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#249A4B"
  },
  statusTextClosed: {
    color: "#C7362E"
  },
  timeText: {
    marginTop: 4,
    fontSize: 9,
    color: "#7A7168"
  },
  emptyState: {
    marginHorizontal: 14,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEE8E0",
    alignItems: "center"
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#201914",
    marginBottom: 4
  },
  emptyText: {
    fontSize: 11,
    color: "#7A7168"
  }
});
