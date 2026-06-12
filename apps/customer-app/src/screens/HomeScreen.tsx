import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
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
import * as Location from "expo-location";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getPartners } from "../api/menu.api";
import { getMyOrders } from "../api/order.api";
import { useCart } from "../context/CartContext";
import { getPublicAddressText, getPublicShopName } from "../utils/display";
import { getOrderBadgeCount } from "../utils/orderBadges";

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
  distanceKm?: number;
}

interface Props {
  navigation: HomeScreenNavigationProp;
}

const categoryLabels: Record<string, string> = {
  all: "All",
  bakery: "Bakery",
  "tiffin-center": "Tiffins",
  "cloud-kitchen": "Cloud Kitchen",
  "mini-restaurant": "Restaurant",
  sweets: "Sweets",
  "fast-food": "Fast Food",
  "ice-creams": "Ice Creams",
  other: "Local Shop"
};

const filterOptions = [
  { key: "all", label: "All", icon: "view-grid-outline" },
  { key: "tiffin-center", label: "Tiffins", icon: "food-outline" },
  { key: "cloud-kitchen", label: "Cloud Kitchen", icon: "chef-hat" },
  { key: "mini-restaurant", label: "Restaurant", icon: "silverware-fork-knife" },
  { key: "bakery", label: "Bakery", icon: "cupcake-outline" },
  { key: "fast-food", label: "Fast Food", icon: "hamburger" },
  { key: "sweets", label: "Sweets", icon: "cookie-outline" },
  { key: "other", label: "More", icon: "storefront-outline" }
];

const NEARBY_RADIUS_KM = 3;
const LOCATION_TIMEOUT_MS = 8000;
const PERMISSION_TIMEOUT_MS = 10000;
const LOCATION_PERMISSION_MESSAGE = `Allow location to view shops within ${NEARBY_RADIUS_KM} km of you.`;

type LocationPermissionPrompt = {
  canOpenSettings: boolean;
  message: string;
};

const shopPlaceholders: Record<string, string> = {
  bakery:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=240&q=80",
  "tiffin-center":
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=240&q=80",
  "cloud-kitchen":
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=240&q=80",
  "mini-restaurant":
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=240&q=80",
  "fast-food":
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=240&q=80",
  sweets:
    "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=240&q=80"
};

const extractShops = (response: any): Shop[] => Array.isArray(response?.data) ? response.data : [];

async function resolveWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

const getCurrentPositionWithTimeout = () =>
  resolveWithTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), LOCATION_TIMEOUT_MS);

const formatBadgeCount = (count: number) => (count > 99 ? "99+" : String(count));

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { getItemCount } = useCart();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationMessage, setLocationMessage] = useState(`Showing shops within ${NEARBY_RADIUS_KM} km`);
  const [locationPermissionPrompt, setLocationPermissionPrompt] = useState<LocationPermissionPrompt | null>(null);
  const [activeOrderCount, setActiveOrderCount] = useState(0);

  const loadOrderBadgeCount = useCallback(async () => {
    try {
      const response = await getMyOrders();
      const orders = Array.isArray(response.data) ? response.data : [];
      setActiveOrderCount(getOrderBadgeCount(orders));
    } catch {
      setActiveOrderCount(0);
    }
  }, []);

  useEffect(() => {
    loadNearbyShops();
    loadOrderBadgeCount();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadOrderBadgeCount);
    return unsubscribe;
  }, [loadOrderBadgeCount, navigation]);

  const openLocationSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert("Settings unavailable", "Open your phone settings and allow location for Vyaha.");
    });
  };

  const showLocationPermissionAlert = (prompt: LocationPermissionPrompt) => {
    Alert.alert(
      "Location Access Needed",
      prompt.message,
      prompt.canOpenSettings
        ? [
            { text: "Not Now", style: "cancel" },
            { text: "Open Settings", onPress: openLocationSettings }
          ]
        : [
            { text: "Not Now", style: "cancel" },
            { text: "Allow Location", onPress: () => loadNearbyShops() }
          ]
    );
  };

  const requireLocationPermission = (
    canOpenSettings: boolean,
    message = LOCATION_PERMISSION_MESSAGE,
    showAlert = true
  ) => {
    const prompt = { canOpenSettings, message };
    setShops([]);
    setLocationMessage(message);
    setLocationPermissionPrompt(prompt);
    if (showAlert) {
      showLocationPermissionAlert(prompt);
    }
  };

  const requestHomeLocationPermission = async () => {
    const existingPermission = await resolveWithTimeout(
      Location.getForegroundPermissionsAsync(),
      PERMISSION_TIMEOUT_MS
    );
    if (!existingPermission) {
      requireLocationPermission(false, "Location permission did not open. Tap Allow Location to try again.");
      return false;
    }

    if (existingPermission.status === "granted") {
      return true;
    }

    if (existingPermission.canAskAgain === false) {
      requireLocationPermission(true);
      return false;
    }

    const permission = await resolveWithTimeout(
      Location.requestForegroundPermissionsAsync(),
      PERMISSION_TIMEOUT_MS
    );
    if (!permission) {
      requireLocationPermission(false, "Location permission did not open. Tap Allow Location to try again.");
      return false;
    }

    if (permission.status === "granted") {
      return true;
    }

    requireLocationPermission(permission.canAskAgain === false);
    return false;
  };

  const loadApprovedShops = async (messageForCount: (count: number) => string) => {
    const fallbackResponse = await getPartners();
    const approvedShops = extractShops(fallbackResponse);

    setShops(approvedShops);
    setLocationMessage(messageForCount(approvedShops.length));
  };

  const loadNearbyShops = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLocationPermissionPrompt(null);

      const hasLocationPermission = await requestHomeLocationPermission();
      if (!hasLocationPermission) {
        return;
      }

      const locationServicesEnabled = await resolveWithTimeout(
        Location.hasServicesEnabledAsync(),
        LOCATION_TIMEOUT_MS
      );
      if (locationServicesEnabled === false) {
        requireLocationPermission(
          true,
          "Turn on device location to view shops near you.",
          false
        );
        return;
      }

      let location: Awaited<ReturnType<typeof getCurrentPositionWithTimeout>>;
      try {
        location = await getCurrentPositionWithTimeout();
      } catch {
        requireLocationPermission(
          true,
          "We could not get your location. Turn on device location or pull to refresh to try again.",
          false
        );
        return;
      }

      if (!location) {
        requireLocationPermission(
          true,
          "We could not get your location yet. Turn on device location or pull to refresh to try again.",
          false
        );
        return;
      }

      const response = await getPartners({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        radiusKm: NEARBY_RADIUS_KM
      });

      const nearbyShops = extractShops(response);

      if (nearbyShops.length > 0) {
        setShops(nearbyShops);
        setLocationPermissionPrompt(null);
        setLocationMessage(
          (response as any)?.locationApplied === false && (response as any)?.message
            ? (response as any).message
            : `Showing shops within ${NEARBY_RADIUS_KM} km of your current location`
        );
      } else {
        await loadApprovedShops((count) =>
          count > 0
            ? `No shops found within ${NEARBY_RADIUS_KM} km. Showing approved shops instead.`
            : "No approved shops found. Check partner approval and setup status."
        );
      }
    } catch (error: any) {
      try {
        await loadApprovedShops((count) =>
          count > 0
            ? "Showing approved shops while nearby lookup is unavailable."
            : "No approved shops found. Check partner approval and setup status."
        );
      } catch (fallbackError: any) {
        Alert.alert("Error", fallbackError.message || error.message || "Failed to load shops");
        setShops([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatAddress = (address: string | AddressObject): string => {
    if (!address) return "Address not available";
    if (typeof address === "string") return getPublicAddressText(address);
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
  const cartItemCount = getItemCount();

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
    <View style={styles.headerWrap}>
      <View style={styles.heroRow}>
        <View style={styles.heroTextBlock}>
          <Image source={require("../../assets/vyaha-wordmark.png")} style={styles.brandLogo} resizeMode="contain" />
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatBox}>
              <Text style={styles.heroStatValue}>{shops.length}</Text>
              <Text style={styles.heroStatLabel}>Nearby Shops</Text>
            </View>
            <View style={[styles.heroStatBox, styles.heroStatBoxOpen]}>
              <Text style={[styles.heroStatValue, styles.heroStatValueOpen]}>{openNowCount}</Text>
              <Text style={styles.heroStatLabel}>Open Now</Text>
            </View>
          </View>
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
                {cartItemCount > 0 ? (
                  <View style={styles.quickBadge}>
                    <Text style={styles.quickBadgeText}>{formatBadgeCount(cartItemCount)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.quickActionText}>Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate("Orders")}>
              <View style={styles.quickBadgeWrap}>
                <Feather name="clipboard" size={16} color="#FF6B35" />
                {activeOrderCount > 0 ? <View style={styles.quickActiveDot} /> : null}
              </View>
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
    const displayName = getPublicShopName(item.shopName || item.restaurantName || "Local Shop");
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

          <View style={styles.shopInfoRow}>
            {typeof item.distanceKm === "number" ? (
              <Text style={styles.distanceText}>{item.distanceKm.toFixed(1)} km away</Text>
            ) : (
              <View />
            )}
            <View style={[styles.statusPill, !item.isOpen && styles.statusPillClosed]}>
              <Text style={[styles.statusText, !item.isOpen && styles.statusTextClosed]}>
                {item.isOpen ? "Open" : "Closed"}
              </Text>
            </View>
          </View>

          <View style={styles.shopBottom}>
            <View style={styles.ratingRow}>
              <Feather name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{item.rating?.toFixed(1) || "4.0"}</Text>
            </View>

            <Text style={styles.timeText}>
              {item.openingTime && item.closingTime ? `${item.openingTime} - ${item.closingTime}` : "08:00 - 22:00"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No nearby shops found</Text>
      <Text style={styles.emptyText}>{locationMessage || "Try another category or adjust your search."}</Text>
    </View>
  );

  const renderLocationRequired = () => (
    <View style={styles.emptyState}>
      <Feather name="map-pin" size={26} color="#FF6B35" />
      <Text style={[styles.emptyTitle, styles.permissionTitle]}>Allow location to view shops</Text>
      <Text style={[styles.emptyText, styles.permissionText]}>
        {locationPermissionPrompt?.message || LOCATION_PERMISSION_MESSAGE}
      </Text>
      <TouchableOpacity
        style={styles.permissionButton}
        onPress={locationPermissionPrompt?.canOpenSettings ? openLocationSettings : () => loadNearbyShops()}
      >
        <Text style={styles.permissionButtonText}>
          {locationPermissionPrompt?.canOpenSettings ? "Open Settings" : "Allow Location"}
        </Text>
      </TouchableOpacity>
      {locationPermissionPrompt?.canOpenSettings ? (
        <TouchableOpacity style={styles.permissionRetryButton} onPress={() => loadNearbyShops()}>
          <Text style={styles.permissionRetryText}>I allowed it, try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#FF6B35" />
      <Text style={styles.loadingText}>Finding shops near you...</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={filteredShops}
        keyExtractor={(item) => item._id}
        renderItem={renderShopItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={loading ? renderLoading : locationPermissionPrompt ? renderLocationRequired : renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 14) }]}
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
    paddingTop: 8,
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
    paddingRight: 10,
    alignItems: "flex-start"
  },
  brandLogo: {
    width: 142,
    height: 50,
    marginLeft: -4,
    marginBottom: 8
  },
  subheading: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#6B625A",
    maxWidth: 178
  },
  locationHint: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    color: "#8A6B54",
    maxWidth: 188
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
    width: "100%"
  },
  heroStatBox: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1DED0",
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: "center"
  },
  heroStatBoxOpen: {
    backgroundColor: "#F8FFF8",
    borderColor: "#DDEFD8"
  },
  heroStatValue: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "900",
    color: "#FF6B35"
  },
  heroStatValueOpen: {
    color: "#2B9C4A"
  },
  heroStatLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: "#554B43"
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
  quickActiveDot: {
    position: "absolute",
    top: -3,
    right: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2B9C4A",
    borderWidth: 2,
    borderColor: "#FFFFFF"
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
    marginTop: 7,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEE8E0",
    padding: 9,
    flexDirection: "row",
    shadowColor: "#E9DED2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2
  },
  shopImage: {
    width: 72,
    height: 72,
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
    marginTop: 4
  },
  shopAddress: {
    flex: 1,
    marginLeft: 4,
    fontSize: 10,
    lineHeight: 13,
    color: "#7A7168"
  },
  shopInfoRow: {
    marginTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  distanceText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    color: "#2B9C4A"
  },
  shopBottom: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
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
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
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
    fontSize: 9,
    lineHeight: 12,
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
  },
  permissionTitle: {
    marginTop: 8
  },
  permissionText: {
    maxWidth: 250,
    textAlign: "center",
    lineHeight: 16
  },
  permissionButton: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  permissionButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  permissionRetryButton: {
    marginTop: 9,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  permissionRetryText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FF6B35"
  },
  loadingState: {
    marginHorizontal: 14,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEE8E0",
    alignItems: "center"
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "#7A7168"
  }
});
