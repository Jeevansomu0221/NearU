import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  Switch,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import api, { uploadMultipart } from "../api/client";
import NotificationButton from "../components/NotificationButton";
import { usePartnerTheme } from "../context/PartnerThemeContext";

interface ExtraChoice {
  name: string;
  price: number;
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  isVegetarian?: boolean;
  preparationTime?: number;
  extraChoices?: ExtraChoice[];
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  [key: string]: any;
}

interface UploadResponse {
  success: boolean;
  data: {
    url: string;
  };
  message: string;
}

type PickerAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
};

const withCommonCategories = (categories: string[]) => [...categories, "Hots", "Other"];
const ALL_CATEGORIES_FILTER = "All";
const MENU_IMAGE_TRANSFORMATION = "c_pad,w_1200,h_900,b_auto,q_auto,f_auto";
const LEGACY_MENU_IMAGE_TRANSFORMATIONS = ["c_fill,w_1200,h_900,q_auto,f_auto"];

const CATEGORY_BY_SHOP_TYPE: Record<string, string[]> = {
  bakery: withCommonCategories(["Breads", "Cakes", "Pastries", "Cookies", "Puffs", "Buns"]),
  restaurant: withCommonCategories(["Veg Meals", "Non Veg Meals", "Biryani", "Curries", "Rice", "Combos"]),
  "cloud-kitchen": withCommonCategories(["Veg Meals", "Non Veg Meals", "Biryani", "Curries", "Rice", "Combos"]),
  "mini-restaurant": withCommonCategories(["Veg Meals", "Non Veg Meals", "Biryani", "Curries", "Rice", "Combos"]),
  grocery: withCommonCategories(["Staples", "Snacks", "Dairy", "Beverages", "Personal Care", "Household"]),
  "tiffin-center": withCommonCategories(["Idli", "Dosa", "Poori", "Uttapam", "Meals", "Snacks"]),
  "fast-food": withCommonCategories(["Pizza", "Burgers", "Fries", "Wraps", "Sandwiches", "Combos"]),
  sweets: withCommonCategories(["Milk Sweets", "Dry Sweets", "Namkeen", "Festival Specials", "Sugar-Free"]),
  "ice-creams": withCommonCategories(["Scoops", "Cups", "Family Packs", "Sundaes", "Shakes"]),
  juice: withCommonCategories(["Fresh Juice", "Milkshakes", "Smoothies", "Mocktails", "Fruit Bowls"]),
  other: withCommonCategories(["Main Items", "Snacks", "Beverages", "Desserts", "Specials"])
};

const getUploadMimeType = (filename: string) => {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  if (extension === "pdf") return "application/pdf";
  return "image/jpeg";
};

const getUploadFilename = (asset: PickerAsset, fallbackName: string) => {
  const fromUri = asset.uri.split(/[\\/]/).pop()?.split("?")[0];
  const baseName = (asset.fileName || fromUri || fallbackName).replace(/[^a-zA-Z0-9._-]/g, "_");

  if (/\.[a-z0-9]+$/i.test(baseName)) {
    return baseName;
  }

  const mimeExtension = asset.mimeType?.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return `${baseName}.${mimeExtension}`;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MODAL_HEIGHT = Math.min(SCREEN_HEIGHT * 0.9, 720);

const getMenuImageUrl = (url: string) => {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  if (url.includes(`/${MENU_IMAGE_TRANSFORMATION}/`)) {
    return url;
  }

  for (const transformation of LEGACY_MENU_IMAGE_TRANSFORMATIONS) {
    if (url.includes(`/${transformation}/`)) {
      return url.replace(`/${transformation}/`, `/${MENU_IMAGE_TRANSFORMATION}/`);
    }
  }

  return url.replace("/upload/", `/upload/${MENU_IMAGE_TRANSFORMATION}/`);
};

export default function MenuScreen({ navigation }: any) {
  const { isDarkMode, theme } = usePartnerTheme();
  const insets = useSafeAreaInsets();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedImageAsset, setSelectedImageAsset] = useState<PickerAsset | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(ALL_CATEGORIES_FILTER);
  const [partnerCategory, setPartnerCategory] = useState<string>("other");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Main Items",
    isVegetarian: true,
    preparationTime: "",
    isAvailable: true
  });
  const [extraChoices, setExtraChoices] = useState<ExtraChoice[]>([]);

  useEffect(() => {
    loadPartnerProfile();
    loadMenuItems();
  }, []);

  const availableCategories = CATEGORY_BY_SHOP_TYPE[partnerCategory] || CATEGORY_BY_SHOP_TYPE.other;
  const categoryFilters = [ALL_CATEGORIES_FILTER, ...availableCategories];

  const menuStats = useMemo(() => {
    const available = menuItems.filter((item) => item.isAvailable).length;
    return {
      total: menuItems.length,
      available,
      unavailable: menuItems.length - available
    };
  }, [menuItems]);

  const loadPartnerProfile = async () => {
    try {
      const response = await api.get("/partners/profile");
      const responseData = response.data as ApiResponse<any>;
      const type = responseData?.data?.category || "other";
      setPartnerCategory(type);
      setForm((prev) => ({
        ...prev,
        category: CATEGORY_BY_SHOP_TYPE[type]?.[0] || CATEGORY_BY_SHOP_TYPE.other[0]
      }));
    } catch (error) {
      setPartnerCategory("other");
    }
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesSearch = !query || item.name.toLowerCase().includes(query);
      const matchesCategory = selectedCategoryFilter === ALL_CATEGORIES_FILTER || item.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, search, selectedCategoryFilter]);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const response = await api.get("/partners/menu");
      const responseData = response.data as ApiResponse<MenuItem[]>;
      if (responseData.success) {
        setMenuItems(responseData.data || []);
      } else {
        Alert.alert("Error", responseData.message || "Failed to load menu items");
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  const uploadImageToCloudinary = async (asset: PickerAsset): Promise<string> => {
    const formData = new FormData();
    const filename = getUploadFilename(asset, "menu-image.jpg");
    const type = asset.mimeType || getUploadMimeType(filename);

    // @ts-ignore React Native FormData file object
    formData.append("image", {
      uri: asset.uri,
      type,
      name: filename
    });

    const uploadData = await uploadMultipart<UploadResponse["data"]>("/upload/image", formData);
    if (!uploadData?.success || !uploadData?.data?.url) {
      throw new Error(uploadData.message || "Upload failed");
    }
    return getMenuImageUrl(uploadData.data.url);
  };

  const pickImage = async () => {
    if (pickerBusy || saving) return;
    try {
      setPickerBusy(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant gallery permission to add images");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
        setSelectedImageAsset(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    } finally {
      setPickerBusy(false);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setForm({
      name: "",
      description: "",
      price: "",
      category: availableCategories[0] || "Main Items",
      isVegetarian: true,
      preparationTime: "",
      isAvailable: true
    });
    setExtraChoices([]);
    setImageUri(null);
    setSelectedImageAsset(null);
  };

  const openEditor = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setForm({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        category: item.category || availableCategories[0] || "Main Items",
        isVegetarian: item.isVegetarian !== false,
        preparationTime: item.preparationTime?.toString() || "",
        isAvailable: item.isAvailable
      });
      setExtraChoices(item.extraChoices || []);
      setImageUri(item.imageUrl || null);
      setSelectedImageAsset(null);
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Item name is required");
      return;
    }
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) {
      Alert.alert("Error", "Please enter a valid price");
      return;
    }

    try {
      setSaving(true);
      let imageUrl = editingItem?.imageUrl || "";
      if (imageUri && imageUri !== editingItem?.imageUrl) {
        imageUrl = imageUri.startsWith("https://res.cloudinary.com")
          ? imageUri
          : await uploadImageToCloudinary(selectedImageAsset || { uri: imageUri });
      }

      const normalizedExtras = extraChoices
        .map((choice) => ({
          name: choice.name.trim(),
          price: Number.isFinite(choice.price) ? Math.max(0, choice.price) : 0
        }))
        .filter((choice) => choice.name.length > 0);

      const menuData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        category: form.category,
        isVegetarian: form.isVegetarian,
        preparationTime: form.preparationTime ? parseInt(form.preparationTime, 10) : undefined,
        isAvailable: form.isAvailable,
        imageUrl,
        extraChoices: normalizedExtras
      };

      if (editingItem) {
        await api.put(`/partners/menu/${editingItem._id}`, menuData);
        Alert.alert("Success", "Menu item updated successfully");
      } else {
        await api.post("/partners/menu", menuData);
        if (menuItems.length === 0) {
          try {
            await api.post("/partners/complete-setup");
          } catch (setupError) {
            console.error("Failed to mark setup complete:", setupError);
          }
        }
        Alert.alert("Success", "Menu item added successfully");
      }

      setModalVisible(false);
      resetForm();
      loadMenuItems();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || error.message || "Failed to save menu item");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      await api.patch(`/partners/menu/${item._id}/availability`, {
        isAvailable: !item.isAvailable
      });
      loadMenuItems();
    } catch (error) {
      Alert.alert("Error", "Failed to update availability");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this menu item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/partners/menu/${id}`);
            loadMenuItems();
          } catch (error) {
            Alert.alert("Error", "Failed to delete item");
          }
        }
      }
    ]);
  };

  const renderPill = (label: string, tone: "neutral" | "veg" | "available" | "unavailable" = "neutral") => (
    <View style={[styles.pill, styles[`${tone}Pill`]]}>
      <Text style={[styles.pillText, styles[`${tone}PillText`]]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  const renderStatCard = (label: string, value: number, tone: "total" | "available" | "unavailable") => (
    <View style={[styles.statCard, styles[`${tone}StatCard`], isDarkMode && styles.cardDark]}>
      <Text style={[styles.statValue, isDarkMode && styles.textDark]}>{value}</Text>
      <Text style={[styles.statLabel, isDarkMode && styles.mutedTextDark]}>{label}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={[styles.menuItem, isDarkMode && styles.cardDark]}>
      {item.imageUrl ? (
        <Image source={{ uri: getMenuImageUrl(item.imageUrl) }} style={styles.itemImage} />
      ) : (
        <View style={[styles.itemImage, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}

      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleWrap}>
            <Text style={[styles.itemName, isDarkMode && styles.textDark]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.itemDescription, isDarkMode && styles.mutedTextDark]} numberOfLines={1}>
              {item.description || "Freshly prepared in-store."}
            </Text>
          </View>
          <Text style={styles.itemPrice}>Rs {item.price}</Text>
        </View>
        <View style={styles.badgeRow}>
          {renderPill(item.category || "Other")}
          {renderPill(`${item.preparationTime || 15} min`)}
          {item.isVegetarian ? renderPill("Veg", "veg") : null}
        </View>
        <View style={styles.itemFooter}>
          <View style={styles.switchRow}>
            {renderPill(item.isAvailable ? "Available" : "Unavailable", item.isAvailable ? "available" : "unavailable")}
            <Switch
              value={item.isAvailable}
              onValueChange={() => toggleAvailability(item)}
              trackColor={{ false: "#D9E6F7", true: "#9FC8FF" }}
              thumbColor={item.isAvailable ? "#60A5FA" : "#9AB3CC"}
              style={styles.itemSwitch}
            />
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionLink} onPress={() => openEditor(item)}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionLink} onPress={() => handleDelete(item._id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading && menuItems.length === 0) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.containerDark]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, isDarkMode && styles.mutedTextDark]}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[styles.backButton, isDarkMode && styles.cardDark]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primaryDark} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>Menu Management</Text>
          <Text style={[styles.subtitle, isDarkMode && styles.mutedTextDark]}>Quick edits for prices, photos, and availability</Text>
        </View>
        <NotificationButton onPress={() => navigation.navigate("Orders")} />
      </View>

      <View style={styles.statsRow}>
        {renderStatCard("Items", menuStats.total, "total")}
        {renderStatCard("Live", menuStats.available, "available")}
        {renderStatCard("Hidden", menuStats.unavailable, "unavailable")}
      </View>

      <View style={[styles.searchWrap, isDarkMode && styles.cardDark]}>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.inputDark]}
            placeholder="Search menu items"
            placeholderTextColor={isDarkMode ? "#9FB0C5" : "#98A2B3"}
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.addButton} onPress={() => openEditor()}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {categoryFilters.map((category) => {
            const selected = selectedCategoryFilter === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.filterChip, isDarkMode && styles.filterChipDark, selected && styles.filterChipSelected]}
                onPress={() => setSelectedCategoryFilter(category)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isDarkMode && styles.mutedTextDark, selected && styles.filterChipTextSelected]}>{category}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {filteredItems.length === 0 ? (
        <View style={[styles.emptyState, isDarkMode && styles.cardDark]}>
          <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>{menuItems.length === 0 ? "No menu items yet" : "No matching items"}</Text>
          <Text style={[styles.emptySubtext, isDarkMode && styles.mutedTextDark]}>
            {menuItems.length === 0 ? "Add your first item to start receiving customer orders." : "Try a different search term."}
          </Text>
          {menuItems.length === 0 ? (
            <TouchableOpacity style={styles.emptyButton} onPress={() => openEditor()}>
              <Text style={styles.emptyButtonText}>Add First Item</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90 }}
          refreshing={loading}
          onRefresh={loadMenuItems}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => !saving && setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              if (!saving) {
                setModalVisible(false);
                resetForm();
              }
            }}
          />
          <View style={[styles.modalSheetWrap, { paddingBottom: insets.bottom + 8 }]}>
            <View style={[styles.modalContent, { height: MODAL_HEIGHT }]}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderCopy}>
                  <Text style={styles.modalTitle}>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</Text>
                  <Text style={styles.modalSubtitle}>
                    {editingItem ? "Update details customers see on your menu" : "Fill in the details to list this item"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    if (!saving) {
                      setModalVisible(false);
                      resetForm();
                    }
                  }}
                  disabled={saving}
                >
                  <Ionicons name="close" size={20} color="#5E7897" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBodyScroll}
                contentContainerStyle={styles.modalBodyContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces
              >
                <Text style={styles.formSectionLabel}>Photo</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={saving || pickerBusy}>
                  {imageUri ? (
                    <>
                      <Image source={{ uri: getMenuImageUrl(imageUri) }} style={styles.selectedImage} />
                      <View style={styles.imagePickerCopy}>
                        <Text style={styles.imagePlaceholderText}>Photo selected</Text>
                        <Text style={styles.imagePlaceholderSubtext}>Tap to change. We resize it automatically.</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#7CA2C7" />
                    </>
                  ) : (
                    <>
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#60A5FA" />
                      </View>
                      <View style={styles.imagePickerCopy}>
                        <Text style={styles.imagePlaceholderText}>Add photo</Text>
                        <Text style={styles.imagePlaceholderSubtext}>Auto resized for menu cards.</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#7CA2C7" />
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.formSectionLabel}>Basic details</Text>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Item name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Mango Smoothie"
                    placeholderTextColor="#98A2B3"
                    value={form.name}
                    onChangeText={(text) => setForm({ ...form, name: text })}
                    editable={!saving}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Short description for customers"
                    placeholderTextColor="#98A2B3"
                    value={form.description}
                    onChangeText={(text) => setForm({ ...form, description: text })}
                    multiline
                    numberOfLines={3}
                    editable={!saving}
                  />
                </View>
                <View style={styles.formRow}>
                  <View style={[styles.formField, styles.formFieldHalf]}>
                    <Text style={styles.fieldLabel}>Price (Rs) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor="#98A2B3"
                      value={form.price}
                      onChangeText={(text) => setForm({ ...form, price: text.replace(/[^0-9.]/g, "") })}
                      keyboardType="decimal-pad"
                      editable={!saving}
                    />
                  </View>
                  <View style={[styles.formField, styles.formFieldHalf]}>
                    <Text style={styles.fieldLabel}>Prep time (min)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="15"
                      placeholderTextColor="#98A2B3"
                      value={form.preparationTime}
                      onChangeText={(text) => setForm({ ...form, preparationTime: text.replace(/\D/g, "") })}
                      keyboardType="number-pad"
                      editable={!saving}
                    />
                  </View>
                </View>

                <Text style={styles.formSectionLabel}>Category</Text>
                <View style={styles.categoryWrap}>
                  {availableCategories.map((category) => {
                    const selected = form.category === category;
                    return (
                      <TouchableOpacity
                        key={category}
                        style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                        onPress={() => setForm({ ...form, category })}
                        disabled={saving}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{category}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.formSectionLabel}>Availability</Text>
                <View style={styles.switchCard}>
                  <View style={styles.formSwitchRow}>
                    <View style={styles.switchCopy}>
                      <Text style={styles.formSwitchLabel}>Vegetarian</Text>
                      <Text style={styles.formSwitchHint}>Show veg badge on menu</Text>
                    </View>
                    <Switch
                      value={form.isVegetarian}
                      onValueChange={(value) => setForm({ ...form, isVegetarian: value })}
                      disabled={saving}
                      trackColor={{ false: "#D9E6F7", true: "#9FC8FF" }}
                      thumbColor={form.isVegetarian ? "#60A5FA" : "#9AB3CC"}
                    />
                  </View>
                  <View style={styles.switchDivider} />
                  <View style={styles.formSwitchRow}>
                    <View style={styles.switchCopy}>
                      <Text style={styles.formSwitchLabel}>Available for order</Text>
                      <Text style={styles.formSwitchHint}>Hidden items won't appear to customers</Text>
                    </View>
                    <Switch
                      value={form.isAvailable}
                      onValueChange={(value) => setForm({ ...form, isAvailable: value })}
                      disabled={saving}
                      trackColor={{ false: "#D9E6F7", true: "#9FC8FF" }}
                      thumbColor={form.isAvailable ? "#60A5FA" : "#9AB3CC"}
                    />
                  </View>
                </View>

                <View style={styles.extrasSectionCard}>
                  <Text style={styles.modalLabel}>Extra choices (optional)</Text>
                  <Text style={styles.modalHint}>
                    Add options like extra cheese or larger portion. These options show only for this item.
                  </Text>

                  {extraChoices.length === 0 ? (
                    <View style={styles.emptyExtrasState}>
                      <Ionicons name="list-outline" size={16} color="#7B8DA6" />
                      <Text style={styles.emptyExtrasText}>No extra choices added yet</Text>
                    </View>
                  ) : null}

                  {extraChoices.map((choice, index) => (
                    <View key={`extra-${index}`} style={styles.extraChoiceRow}>
                      <TextInput
                        style={[styles.input, styles.extraChoiceNameInput]}
                        placeholder="Choice name (e.g. Extra cheese)"
                        placeholderTextColor="#98A2B3"
                        value={choice.name}
                        onChangeText={(text) => {
                          const next = [...extraChoices];
                          next[index] = { ...next[index], name: text };
                          setExtraChoices(next);
                        }}
                        editable={!saving}
                      />
                      <TextInput
                        style={[styles.input, styles.extraChoicePriceInput]}
                        placeholder="+Rs"
                        placeholderTextColor="#98A2B3"
                        value={choice.price > 0 ? String(choice.price) : ""}
                        onChangeText={(text) => {
                          const next = [...extraChoices];
                          next[index] = {
                            ...next[index],
                            price: text ? parseFloat(text.replace(/[^0-9.]/g, "")) || 0 : 0
                          };
                          setExtraChoices(next);
                        }}
                        keyboardType="decimal-pad"
                        editable={!saving}
                      />
                      <TouchableOpacity
                        style={styles.extraChoiceRemove}
                        onPress={() => setExtraChoices(extraChoices.filter((_, rowIndex) => rowIndex !== index))}
                        disabled={saving}
                      >
                        <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.addExtraChoiceButton}
                    onPress={() => setExtraChoices([...extraChoices, { name: "", price: 0 }])}
                    disabled={saving}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
                    <Text style={styles.addExtraChoiceText}>Add extra choice</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    if (!saving) {
                      setModalVisible(false);
                      resetForm();
                    }
                  }}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>{editingItem ? "Update Item" : "Save Item"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {!modalVisible ? (
        <TouchableOpacity
          style={[styles.fabButton, { bottom: 18 + insets.bottom }]}
          onPress={() => openEditor()}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FF"
  },
  containerDark: {
    backgroundColor: "#0B1220"
  },
  cardDark: {
    backgroundColor: "#111827",
    borderColor: "#263449"
  },
  textDark: {
    color: "#E5EDF7"
  },
  mutedTextDark: {
    color: "#9FB0C5"
  },
  inputDark: {
    backgroundColor: "#0F172A",
    borderColor: "#263449",
    color: "#E5EDF7"
  },
  filterChipDark: {
    backgroundColor: "#1D2A3D",
    borderColor: "#263449"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F8FF"
  },
  loadingText: {
    marginTop: 12,
    color: "#5C6F87",
    fontSize: 15
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    marginRight: 10
  },
  headerCopy: {
    flex: 1,
    marginRight: 10
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#143A66"
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#5E7897"
  },
  addButton: {
    backgroundColor: "#60A5FA",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center"
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 3
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1
  },
  totalStatCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D9E6F7"
  },
  availableStatCard: {
    backgroundColor: "#EAF8EF",
    borderColor: "#CDEFD8"
  },
  unavailableStatCard: {
    backgroundColor: "#FFF4ED",
    borderColor: "#FED7AA",
    marginRight: 0
  },
  statValue: {
    fontSize: 21,
    fontWeight: "900",
    color: "#143A66"
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "800",
    color: "#5E7897"
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    color: "#123456",
    marginRight: 10
  },
  filterScroll: {
    paddingTop: 12,
    paddingBottom: 4
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    marginRight: 8
  },
  filterChipSelected: {
    backgroundColor: "#143A66",
    borderColor: "#143A66"
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#44678E"
  },
  filterChipTextSelected: {
    color: "#FFFFFF"
  },
  menuItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    padding: 9,
    marginBottom: 8
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 8
  },
  placeholderImage: {
    backgroundColor: "#EAF3FF",
    justifyContent: "center",
    alignItems: "center"
  },
  placeholderText: {
    fontSize: 11,
    color: "#5D7698"
  },
  itemInfo: {
    flex: 1
  },
  itemTitleWrap: {
    flex: 1,
    marginRight: 8
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4
  },
  itemName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#143A66"
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#60A5FA"
  },
  itemDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: "#5E7897",
    marginTop: 3
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 8
  },
  pill: {
    minHeight: 28,
    minWidth: 58,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    marginBottom: 6
  },
  pillText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    textAlign: "center"
  },
  neutralPill: {
    backgroundColor: "#ECF4FF"
  },
  neutralPillText: {
    color: "#44678E"
  },
  vegPill: {
    backgroundColor: "#E8F5E9",
    minWidth: 50
  },
  vegPillText: {
    color: "#216E39"
  },
  availablePill: {
    backgroundColor: "#E8F5E9",
    minWidth: 78
  },
  availablePillText: {
    color: "#216E39"
  },
  unavailablePill: {
    backgroundColor: "#FDECEC",
    minWidth: 88
  },
  unavailablePillText: {
    color: "#B42318"
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  itemSwitch: {
    transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }],
    marginLeft: -2
  },
  actionButtons: {
    flexDirection: "row"
  },
  actionLink: {
    paddingHorizontal: 4
  },
  editText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#60A5FA",
    marginRight: 10
  },
  deleteText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B42318"
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#143A66",
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5E7897",
    textAlign: "center",
    marginBottom: 18
  },
  emptyButton: {
    backgroundColor: "#60A5FA",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end"
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  modalSheetWrap: {
    paddingHorizontal: 12
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    overflow: "hidden",
    shadowColor: "#143A66",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D9E6F7",
    marginTop: 10,
    marginBottom: 4
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E7EEF8"
  },
  modalHeaderCopy: {
    flex: 1,
    marginRight: 12
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF5FF"
  },
  modalBodyScroll: {
    flex: 1
  },
  modalBodyContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#143A66"
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#6A86A8"
  },
  formSectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5E7897",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10
  },
  formField: {
    marginBottom: 12
  },
  formFieldHalf: {
    flex: 1
  },
  formRow: {
    flexDirection: "row",
    gap: 10
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#143A66",
    marginBottom: 6
  },
  imagePicker: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#EEF5FF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    padding: 10
  },
  selectedImage: {
    width: 72,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#D9E6F7"
  },
  imagePlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    justifyContent: "center",
    alignItems: "center"
  },
  imagePickerCopy: {
    flex: 1,
    marginLeft: 12
  },
  imagePlaceholderText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#143A66"
  },
  imagePlaceholderSubtext: {
    fontSize: 12,
    color: "#6A86A8",
    marginTop: 4,
    lineHeight: 16
  },
  input: {
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#123456",
    backgroundColor: "#FFFFFF",
    marginBottom: 0
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: "top"
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#486887",
    marginBottom: 8
  },
  modalHint: {
    fontSize: 11,
    lineHeight: 16,
    color: "#7B8DA6",
    marginBottom: 10
  },
  extraChoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8
  },
  extraChoiceNameInput: {
    flex: 1,
    marginBottom: 0
  },
  extraChoicePriceInput: {
    width: 88,
    marginBottom: 0
  },
  extraChoiceRemove: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  addExtraChoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14
  },
  addExtraChoiceText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB"
  },
  extrasSectionCard: {
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 14,
    backgroundColor: "#F8FBFF",
    padding: 12,
    marginBottom: 8
  },
  emptyExtrasState: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF5FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10
  },
  emptyExtrasText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#5E7897",
    fontWeight: "600"
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 18
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#ECF4FF",
    marginRight: 8,
    marginBottom: 8
  },
  categoryChipSelected: {
    backgroundColor: "#60A5FA"
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#44678E"
  },
  categoryChipTextSelected: {
    color: "#FFFFFF"
  },
  formSwitchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10
  },
  switchCard: {
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 14,
    backgroundColor: "#F8FBFF",
    paddingHorizontal: 14,
    marginBottom: 18
  },
  switchDivider: {
    height: 1,
    backgroundColor: "#E7EEF8"
  },
  switchCopy: {
    flex: 1,
    marginRight: 12
  },
  formSwitchLabel: {
    fontSize: 14,
    color: "#143A66",
    fontWeight: "700"
  },
  formSwitchHint: {
    marginTop: 2,
    fontSize: 11,
    color: "#7B8DA6",
    lineHeight: 15
  },
  modalButtons: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E7EEF8",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF"
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#EEF5FF",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 15,
    marginRight: 8
  },
  cancelButtonText: {
    color: "#5E7897",
    fontSize: 14,
    fontWeight: "800"
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#60A5FA",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 15,
    marginLeft: 8
  },
  saveButtonDisabled: {
    backgroundColor: "#9FC8FF"
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  fabButton: {
    position: "absolute",
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#60A5FA",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#143A66",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5
  }
});
