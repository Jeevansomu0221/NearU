import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Animated
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList, Shop } from "../navigation/AppNavigator";
import { getPartnerDetails, getPartnerMenu } from "../api/menu.api";
import {
  addFavoriteFoodItem,
  getMyFavorites,
  removeFavoriteFoodItem
} from "../api/user.api";
import { useCart } from "../context/CartContext";
import { getPublicShopName } from "../utils/display";
import { getVegModePreference } from "../utils/vegMode";
import { getAccessToken } from "../utils/authStorage";

type ShopDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, "ShopDetail">;

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  isAvailable: boolean;
  isVegetarian?: boolean;
  imageUrl?: string;
}

interface Props {
  route: {
    params: {
      shopId: string;
      shop?: Shop;
      vegMode?: boolean;
    };
  };
  navigation: ShopDetailScreenNavigationProp;
}

const shopPlaceholders: Record<string, string> = {
  bakery:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=320&q=80",
  "tiffin-center":
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=320&q=80",
  "cloud-kitchen":
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=320&q=80",
  "mini-restaurant":
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=320&q=80",
  "fast-food":
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=320&q=80",
  sweets:
    "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=320&q=80"
};

const menuPlaceholders = [
  "https://images.unsplash.com/photo-1604908177522-0408f8c3f5e1?auto=format&fit=crop&w=240&q=80",
  "https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=240&q=80",
  "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=240&q=80"
];

const categoryIconMap: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  bakery: "bread-slice-outline",
  "tiffin-center": "food-outline",
  "cloud-kitchen": "chef-hat",
  "mini-restaurant": "silverware-fork-knife",
  "fast-food": "hamburger",
  sweets: "cookie-outline",
  other: "storefront-outline"
};

const categoryLabelMap: Record<string, string> = {
  bakery: "Bakery",
  "tiffin-center": "Tiffins",
  "cloud-kitchen": "Cloud Kitchen",
  "mini-restaurant": "Restaurant",
  "fast-food": "Fast Food",
  sweets: "Sweets",
  other: "Food"
};

interface MenuCardItemProps {
  item: MenuItem;
  index: number;
  quantity: number;
  selectedCategory: string;
  getMenuImage: (item: MenuItem, index: number) => string;
  handleIncrement: (item: MenuItem) => void;
  handleDecrement: (item: MenuItem) => void;
  setPreviewImage: (uri: string | null) => void;
  isFavorite: boolean;
  favoriteBusy: boolean;
  onToggleFavorite: (item: MenuItem) => void;
}

function MenuCardItem({
  item,
  index,
  quantity,
  selectedCategory,
  getMenuImage,
  handleIncrement,
  handleDecrement,
  setPreviewImage,
  isFavorite,
  favoriteBusy,
  onToggleFavorite
}: MenuCardItemProps) {
  const [floaters, setFloaters] = useState<Array<{ id: number; animY: Animated.Value; animOpacity: Animated.Value }>>([]);
  const floaterIdRef = useRef(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    handleIncrement(item);

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true })
    ]).start();

    const id = floaterIdRef.current++;
    const animY = new Animated.Value(0);
    const animOpacity = new Animated.Value(1);

    setFloaters((prev) => [...prev, { id, animY, animOpacity }]);

    Animated.parallel([
      Animated.timing(animY, {
        toValue: -55,
        duration: 750,
        useNativeDriver: true
      }),
      Animated.timing(animOpacity, {
        toValue: 0,
        duration: 750,
        useNativeDriver: true
      })
    ]).start(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id));
    });
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View style={styles.menuCard}>
        {index === 0 ? (
          <View style={styles.bestSellerChip}>
            <Feather name="star" size={11} color="#F59E0B" />
            <Text style={styles.bestSellerText}>Best Seller</Text>
          </View>
        ) : null}

        <View style={styles.menuCardRow}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImage(getMenuImage(item, index))}>
            <Image source={{ uri: getMenuImage(item, index) }} style={styles.menuImage} resizeMode="cover" />
          </TouchableOpacity>

          <View style={styles.menuInfo}>
            <View style={styles.menuInfoTop}>
              <TouchableOpacity
                style={styles.menuTitleBlock}
                activeOpacity={0.9}
                onPress={handlePress}
              >
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemSubtext}>{item.category || selectedCategory}</Text>
              </TouchableOpacity>
              <View style={styles.menuPriceActions}>
                <TouchableOpacity
                  style={[styles.menuFavoriteButton, isFavorite && styles.menuFavoriteButtonActive]}
                  onPress={() => onToggleFavorite(item)}
                  disabled={favoriteBusy}
                  activeOpacity={0.8}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <MaterialCommunityIcons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={18}
                    color={isFavorite ? "#E11D48" : "#A3968D"}
                  />
                </TouchableOpacity>
                <Text style={styles.itemPrice}>Rs {item.price}</Text>
              </View>
            </View>

            <View style={styles.menuCompactRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.menuTextStack}
                onPress={handlePress}
              >
                <Text style={styles.itemDescription} numberOfLines={2}>
                  {item.description || "Freshly prepared in-store with quality ingredients."}
                </Text>
                <View style={styles.readyRow}>
                  <Feather name="clock" size={11} color="#7C7168" />
                  <Text style={styles.readyText}>Ready in a few minutes</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => handleDecrement(item)}
                  disabled={quantity === 0}
                >
                  <Text style={[styles.stepperButtonText, quantity === 0 && styles.stepperButtonDisabled]}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={handlePress}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {floaters.map((f) => (
          <Animated.View
            key={f.id}
            style={[
              styles.floaterBubble,
              {
                transform: [{ translateY: f.animY }],
                opacity: f.animOpacity
              }
            ]}
          >
            <Text style={styles.floaterText}>+1 Added</Text>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

export default function ShopDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { shopId, shop: passedShop, vegMode: initialVegMode } = route.params;
  const [shop, setShop] = useState<Shop | null>(passedShop || null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [vegModeOnly, setVegModeOnly] = useState(Boolean(initialVegMode));
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [favoriteFoodItemIds, setFavoriteFoodItemIds] = useState<Set<string>>(new Set());
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);
  const { items, addItem, updateQuantity, getItemCount, getCartTotal } = useCart();
  const cartScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [menuResponse, shopResponse] = await Promise.all([
          getPartnerMenu(shopId),
          passedShop ? Promise.resolve(null) : getPartnerDetails(shopId)
        ]);

        if (!passedShop && shopResponse && (shopResponse as any).success && (shopResponse as any).data) {
          setShop((shopResponse as any).data);
        }

        if ((menuResponse as any).data && Array.isArray((menuResponse as any).data)) {
          setMenu((menuResponse as any).data.filter((item: MenuItem) => item.isAvailable));
        } else {
          setMenu([]);
        }
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to load restaurant details");
        setMenu([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [passedShop, shopId]);

  const loadFavoriteFoodItems = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setFavoriteFoodItemIds(new Set());
        return;
      }

      const response = await getMyFavorites();
      if (!response.success) {
        return;
      }

      const foodItems = response.data?.foodItems || [];
      setFavoriteFoodItemIds(new Set(foodItems.map((item) => item._id)));
    } catch {
      setFavoriteFoodItemIds(new Set());
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavoriteFoodItems();
    }, [loadFavoriteFoodItems])
  );

  useEffect(() => {
    loadFavoriteFoodItems();
  }, [loadFavoriteFoodItems]);

  const toggleFavoriteFoodItem = async (item: MenuItem) => {
    if (favoriteBusyId) return;

    const token = await getAccessToken();
    if (!token) {
      Alert.alert("Sign in required", "Please log in to save favorite dishes.", [
        { text: "Cancel", style: "cancel" },
        { text: "Log in", onPress: () => navigation.navigate("Login") }
      ]);
      return;
    }

    const wasFavorite = favoriteFoodItemIds.has(item._id);
    const previousIds = favoriteFoodItemIds;
    const nextIds = new Set(favoriteFoodItemIds);
    if (wasFavorite) {
      nextIds.delete(item._id);
    } else {
      nextIds.add(item._id);
    }
    setFavoriteFoodItemIds(nextIds);
    setFavoriteBusyId(item._id);

    try {
      const response = wasFavorite
        ? await removeFavoriteFoodItem(item._id)
        : await addFavoriteFoodItem(item._id);

      if (!response.success) {
        throw new Error(response.message || "Could not update favorites right now.");
      }

      const foodItems = response.data?.foodItems || [];
      setFavoriteFoodItemIds(new Set(foodItems.map((entry) => entry._id)));
    } catch (error: any) {
      setFavoriteFoodItemIds(previousIds);
      Alert.alert("Favorites", error?.message || "Could not update favorites right now.");
    } finally {
      setFavoriteBusyId(null);
    }
  };

  useEffect(() => {
    getVegModePreference()
      .then((enabled) => setVegModeOnly(typeof initialVegMode === "boolean" ? initialVegMode : enabled))
      .catch(() => {});
  }, [initialVegMode]);

  const visibleMenu = useMemo(
    () => (vegModeOnly ? menu.filter((item) => item.isVegetarian !== false) : menu),
    [menu, vegModeOnly]
  );

  const groupedMenu = useMemo(() => {
    const map = new Map<string, MenuItem[]>();

    visibleMenu.forEach((item) => {
      const key = item.category?.trim() || "Popular";
      const existing = map.get(key) || [];
      existing.push(item);
      map.set(key, existing);
    });

    return Array.from(map.entries());
  }, [visibleMenu]);

  useEffect(() => {
    if (!selectedCategory && groupedMenu.length > 0) {
      setSelectedCategory("All");
    }

    if (
      selectedCategory &&
      selectedCategory !== "All" &&
      !groupedMenu.some(([title]) => title === selectedCategory)
    ) {
      setSelectedCategory("All");
    }
  }, [groupedMenu, selectedCategory]);

  const selectedItems = useMemo(() => {
    if (selectedCategory === "All") {
      return visibleMenu;
    }

    const activeSection = groupedMenu.find(([title]) => title === selectedCategory);
    return activeSection?.[1] || groupedMenu[0]?.[1] || [];
  }, [groupedMenu, selectedCategory, visibleMenu]);

  const getShopName = () => getPublicShopName(shop?.restaurantName || shop?.shopName || "Restaurant");

  const getShopCategoryKey = () => shop?.category || "other";

  const getShopCategoryLabel = () => categoryLabelMap[getShopCategoryKey()] || "Food";

  const getShopCategoryIcon = () => categoryIconMap[getShopCategoryKey()] || "storefront-outline";

  const getMenuImage = (item: MenuItem, index: number) => {
    return item.imageUrl || menuPlaceholders[index % menuPlaceholders.length];
  };

  const getCartQuantity = (item: MenuItem) => {
    const cartItem = items.find(
      (cartEntry) => cartEntry.shopId === shopId && (cartEntry.menuItemId || cartEntry._id) === item._id
    );
    return cartItem?.quantity || 0;
  };

  const handleIncrement = (item: MenuItem) => {
    if (!shop) return;

    const quantity = getCartQuantity(item);
    if (quantity === 0) {
      addItem({
        _id: item._id,
        menuItemId: item._id,
        name: item.name,
        price: item.price,
        quantity: 1,
        shopId: shop._id,
        shopName: getShopName()
      });
      return;
    }

    updateQuantity(
      {
        shopId: shop._id,
        menuItemId: item._id,
        name: item.name
      },
      quantity + 1
    );
  };

  const handleDecrement = (item: MenuItem) => {
    if (!shop) return;

    const quantity = getCartQuantity(item);
    if (quantity <= 0) return;

    updateQuantity(
      {
        shopId: shop._id,
        menuItemId: item._id,
        name: item.name
      },
      quantity - 1
    );
  };

  const itemCount = getItemCount();
  const totalAmount = getCartTotal();

  useEffect(() => {
    if (itemCount > 0) {
      Animated.sequence([
        Animated.timing(cartScaleAnim, { toValue: 1.25, duration: 100, useNativeDriver: true }),
        Animated.spring(cartScaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true })
      ]).start();
    }
  }, [cartScaleAnim, itemCount]);

  if (!shop && loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading restaurant details...</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>Restaurant not found</Text>
      </View>
    );
  }

  const bannerImage = shop.shopImageUrl || shopPlaceholders[getShopCategoryKey()] || shopPlaceholders["mini-restaurant"];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B35" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Restaurant Details</Text>
        <View style={styles.topBarSpacer} pointerEvents="none" />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.content, { paddingBottom: 118 + Math.max(insets.bottom, 12) }]}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <View style={styles.headerBackground}>
            <TouchableOpacity style={styles.bannerCard} activeOpacity={0.9} onPress={() => setPreviewImage(bannerImage)}>
              <Image source={{ uri: bannerImage }} style={styles.bannerImage} resizeMode="cover" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.shopIconBubble}>
              <MaterialCommunityIcons name={getShopCategoryIcon()} size={22} color="#FFFFFF" />
            </View>

            <View style={styles.infoTopRow}>
              <View style={styles.infoTextBlock}>
                <Text style={styles.shopName}>{getShopName()}</Text>
                <View style={styles.categoryTimeRow}>
                  <View style={styles.categoryChip}>
                    <MaterialCommunityIcons name={getShopCategoryIcon()} size={13} color="#C96C2F" />
                    <Text style={styles.categoryChipText}>{getShopCategoryLabel()}</Text>
                  </View>
                  <View style={styles.timeChip}>
                    <Feather name="clock" size={13} color="#2F7553" />
                    <Text style={styles.timeValue}>
                      {shop.openingTime && shop.closingTime ? `${shop.openingTime} - ${shop.closingTime}` : "08:00 - 22:00"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoMetaBlock}>
                <View style={[styles.statusPill, !shop.isOpen && styles.statusPillClosed]}>
                  <Text style={[styles.statusText, !shop.isOpen && styles.statusTextClosed]}>
                    {shop.isOpen ? "Open" : "Closed"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.menuStickySection}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Menu</Text>
            <Text style={styles.menuSubtitle}>
              {vegModeOnly ? `${visibleMenu.length} veg items` : `${menu.length} items available`}
            </Text>
          </View>

          {!loading && menu.length > 0 && visibleMenu.length > 0 ? (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabs}
            >
              {["All", ...groupedMenu.map(([section]) => section)].map((section) => {
                const active = selectedCategory === section;

                return (
                  <TouchableOpacity
                    key={section}
                    style={[styles.categoryTab, active && styles.categoryTabActive]}
                    onPress={() => setSelectedCategory(section)}
                  >
                    <MaterialCommunityIcons
                      name={section === "All" ? "view-grid-outline" : active ? "silverware-fork-knife" : "food-outline"}
                      size={14}
                      color={active ? "#FFFFFF" : "#6B6058"}
                      style={styles.categoryTabIcon}
                    />
                    <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>{section}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading menu...</Text>
          </View>
        ) : menu.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Menu unavailable</Text>
            <Text style={styles.emptyBody}>This restaurant has not added any available items yet.</Text>
          </View>
        ) : visibleMenu.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No veg items available</Text>
            <Text style={styles.emptyBody}>Veg Mode is on, but this restaurant has no available veg items right now.</Text>
          </View>
        ) : (
          <View style={styles.menuList}>
            {selectedItems.map((item, index) => {
              const quantity = getCartQuantity(item);

              return (
                <MenuCardItem
                  key={item._id}
                  item={item}
                  index={index}
                  quantity={quantity}
                  selectedCategory={selectedCategory}
                  getMenuImage={getMenuImage}
                  handleIncrement={handleIncrement}
                  handleDecrement={handleDecrement}
                  setPreviewImage={setPreviewImage}
                  isFavorite={favoriteFoodItemIds.has(item._id)}
                  favoriteBusy={favoriteBusyId === item._id}
                  onToggleFavorite={toggleFavoriteFoodItem}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.footerLeft}>
          <Animated.View style={[styles.footerCartIcon, { transform: [{ scale: cartScaleAnim }] }]}>
            <Feather name="shopping-cart" size={16} color="#FF6B35" />
            {itemCount > 0 ? (
              <View style={styles.footerBadge}>
                <Text style={styles.footerBadgeText}>{itemCount}</Text>
              </View>
            ) : null}
          </Animated.View>
          <View>
            <Text style={styles.footerLabel}>Cart</Text>
            <Text style={styles.footerItems}>{itemCount} item{itemCount === 1 ? "" : "s"}</Text>
          </View>
        </View>

        <View style={styles.footerPriceBlock}>
          <Text style={styles.footerPriceLabel}>Total</Text>
          <Text style={styles.footerPriceValue}>Rs {totalAmount}</Text>
        </View>

        <TouchableOpacity
          style={[styles.viewCartButton, itemCount === 0 && styles.viewCartButtonDisabled]}
          onPress={() => navigation.navigate("Cart")}
          disabled={itemCount === 0}
        >
          <Text style={styles.viewCartButtonText}>{itemCount === 0 ? "Add Items" : "View Cart"}</Text>
          <Feather name="chevron-right" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal visible={Boolean(previewImage)} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <Pressable style={styles.imagePreviewOverlay} onPress={() => setPreviewImage(null)}>
          <TouchableOpacity style={styles.imagePreviewClose} onPress={() => setPreviewImage(null)} activeOpacity={0.85}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImage ? (
            <View pointerEvents="none" style={styles.imagePreviewFrame}>
              <Image source={{ uri: previewImage }} style={styles.imagePreview} resizeMode="contain" />
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF6B35"
  },
  scrollArea: {
    flex: 1,
    backgroundColor: "#FBF8F4"
  },
  content: {
    paddingBottom: 120
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 34
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#71655C"
  },
  headerBackground: {
    backgroundColor: "#FF6B35",
    paddingBottom: 38,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28
  },
  topBar: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  topBarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  topBarSpacer: {
    width: 34,
    height: 34
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  bannerCard: {
    marginTop: 10,
    marginHorizontal: 14,
    height: 148,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#F4D9C7"
  },
  bannerImage: {
    width: "100%",
    height: "100%"
  },
  infoCard: {
    marginTop: -28,
    marginHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFE7DE",
    padding: 12,
    paddingTop: 14,
    shadowColor: "#E4D7CB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4
  },
  shopIconBubble: {
    position: "absolute",
    left: 18,
    top: -28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF"
  },
  infoTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 8
  },
  infoTextBlock: {
    flex: 1,
    paddingRight: 10
  },
  shopName: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    color: "#201914"
  },
  categoryChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFF1E6"
  },
  categoryTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  categoryChipText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: "700",
    color: "#C96C2F"
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#F0FAF3"
  },
  infoMetaBlock: {
    alignItems: "flex-end"
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#EAF8EA"
  },
  statusPillClosed: {
    backgroundColor: "#FDE8E8"
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#249A4B"
  },
  statusTextClosed: {
    color: "#C7362E"
  },
  ratingBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8
  },
  ratingValue: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: "900",
    color: "#E4A11D"
  },
  reviewText: {
    marginTop: 2,
    fontSize: 10,
    color: "#8C8077"
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8
  },
  detailText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 12,
    lineHeight: 17,
    color: "#71655C"
  },
  timeValue: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "800",
    color: "#2F7553"
  },
  menuHeader: {
    marginTop: 14,
    marginHorizontal: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12
  },
  menuStickySection: {
    backgroundColor: "#FBF8F4",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE8E0"
  },
  menuTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#201914"
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#7A7067",
    textAlign: "right",
    flexShrink: 1,
    paddingBottom: 2
  },
  categoryTabs: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 2
  },
  categoryTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE8E0",
    marginRight: 8
  },
  categoryTabActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35"
  },
  categoryTabIcon: {
    marginRight: 5
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5F564F"
  },
  categoryTabTextActive: {
    color: "#FFFFFF"
  },
  menuList: {
    paddingHorizontal: 14,
    paddingTop: 6
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEE8E0",
    padding: 8,
    marginBottom: 7,
    shadowColor: "#E7DCCF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2
  },
  bestSellerChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#FFF3E5",
    marginBottom: 5
  },
  bestSellerText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: "700",
    color: "#D98416"
  },
  menuCardRow: {
    flexDirection: "row"
  },
  menuImage: {
    width: 68,
    height: 68,
    borderRadius: 13,
    backgroundColor: "#F4E7DB"
  },
  menuInfo: {
    flex: 1,
    paddingLeft: 9
  },
  menuInfoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  menuTitleBlock: {
    flex: 1,
    paddingRight: 6
  },
  itemName: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
    color: "#201914"
  },
  itemSubtext: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "700",
    color: "#FF6B35"
  },
  itemPrice: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    color: "#FF6B35"
  },
  menuPriceActions: {
    alignItems: "flex-end",
    gap: 6
  },
  menuFavoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F2EC",
    zIndex: 2
  },
  menuFavoriteButtonActive: {
    backgroundColor: "#FFE4E6"
  },
  reviewsSection: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingBottom: 12
  },
  reviewsList: {
    gap: 10
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFE7DE",
    padding: 14
  },
  reviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: "800",
    color: "#201914"
  },
  reviewStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  reviewRating: {
    fontSize: 12,
    fontWeight: "800",
    color: "#A15C00"
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5C524B"
  },
  reviewCommentMuted: {
    fontSize: 12,
    color: "#A3968D",
    fontStyle: "italic"
  },
  priceActionBlock: {
    alignItems: "flex-end",
    minWidth: 92
  },
  menuCompactRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  menuTextStack: {
    flex: 1,
    minWidth: 0
  },
  itemDescription: {
    fontSize: 11,
    lineHeight: 14,
    color: "#72675E"
  },
  readyRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center"
  },
  readyText: {
    marginLeft: 4,
    fontSize: 10,
    lineHeight: 12,
    color: "#7C7168"
  },
  actionsColumn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1C3AA",
    borderRadius: 999,
    paddingHorizontal: 1,
    height: 28,
    alignSelf: "center"
  },
  stepperButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  stepperButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D76E35"
  },
  stepperButtonDisabled: {
    color: "#CFB8A8"
  },
  stepperValue: {
    minWidth: 20,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "#201914"
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    minWidth: 96,
    height: 36
  },
  addButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  emptyCard: {
    marginHorizontal: 14,
    marginTop: 12,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE8E0",
    alignItems: "center"
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#201914"
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: "#7A7067",
    textAlign: "center"
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopWidth: 1,
    borderTopColor: "#EDE4DB",
    paddingTop: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  footerCartIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF4EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9
  },
  footerBadge: {
    position: "absolute",
    top: -4,
    right: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2
  },
  footerBadgeText: {
    fontSize: 7,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  footerLabel: {
    fontSize: 11,
    color: "#8B7E74",
    fontWeight: "700"
  },
  footerItems: {
    marginTop: 1,
    fontSize: 14,
    color: "#201914",
    fontWeight: "900"
  },
  footerPriceBlock: {
    alignItems: "center"
  },
  footerPriceLabel: {
    fontSize: 10,
    color: "#8B7E74",
    fontWeight: "700"
  },
  footerPriceValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "900",
    color: "#201914"
  },
  viewCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    height: 44,
    minWidth: 118
  },
  viewCartButtonDisabled: {
    backgroundColor: "#FFB08F"
  },
  viewCartButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    marginRight: 3
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18
  },
  imagePreviewFrame: {
    width: "100%",
    height: "82%"
  },
  imagePreview: {
    width: "100%",
    height: "100%"
  },
  imagePreviewClose: {
    position: "absolute",
    top: 44,
    right: 18,
    zIndex: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  floaterBubble: {
    position: "absolute",
    right: 20,
    top: 10,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 99,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  floaterText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900"
  }
});
