import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  Switch,
  ActivityIndicator,
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import api from "../api/client";

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

const CATEGORIES = ["Restaurant", "Bakery", "Tiffins", "Fast Food", "Unique Foods", "Other"];

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

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Other",
    isVegetarian: true,
    preparationTime: "15",
    isAvailable: true
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return menuItems;
    return menuItems.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  }, [menuItems, search]);

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

  const uploadImageToCloudinary = async (selectedImageUri: string): Promise<string> => {
    const formData = new FormData();
    const filename = selectedImageUri.split("/").pop() || "image.jpg";
    const type = getUploadMimeType(filename);

    // @ts-ignore React Native FormData file object
    formData.append("image", {
      uri: selectedImageUri,
      type,
      name: filename
    });

    const response = await api.post("/upload/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      },
      timeout: 420000
    });

    const uploadData = response.data as UploadResponse;
    if (!uploadData.success) {
      throw new Error(uploadData.message || "Upload failed");
    }
    return uploadData.data.url;
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant gallery permission to add images");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6
      });

      if (!result.canceled && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setForm({
      name: "",
      description: "",
      price: "",
      category: "Other",
      isVegetarian: true,
      preparationTime: "15",
      isAvailable: true
    });
    setImageUri(null);
  };

  const openEditor = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setForm({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        category: item.category || "Other",
        isVegetarian: item.isVegetarian !== false,
        preparationTime: item.preparationTime?.toString() || "15",
        isAvailable: item.isAvailable
      });
      setImageUri(item.imageUrl || null);
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
        imageUrl = imageUri.startsWith("https://res.cloudinary.com") ? imageUri : await uploadImageToCloudinary(imageUri);
      }

      const menuData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        category: form.category,
        isVegetarian: form.isVegetarian,
        preparationTime: parseInt(form.preparationTime, 10) || 15,
        isAvailable: form.isAvailable,
        imageUrl
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

  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.menuItem}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
      ) : (
        <View style={[styles.itemImage, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}

      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleWrap}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemDescription} numberOfLines={1}>
              {item.description || "Freshly prepared in-store."}
            </Text>
          </View>
          <Text style={styles.itemPrice}>Rs {item.price}</Text>
        </View>
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{item.category || "Other"}</Text>
          <Text style={styles.badge}>{item.preparationTime || 15} min</Text>
          {item.isVegetarian ? <Text style={styles.vegBadge}>Veg</Text> : null}
        </View>
        <View style={styles.itemFooter}>
          <View style={styles.switchRow}>
            <Text style={[styles.availabilityPill, item.isAvailable ? styles.availablePill : styles.unavailablePill]}>
              {item.isAvailable ? "Available" : "Unavailable"}
            </Text>
            <Switch
              value={item.isAvailable}
              onValueChange={() => toggleAvailability(item)}
              trackColor={{ false: "#E8DDD2", true: "#FFB08F" }}
              thumbColor={item.isAvailable ? "#FF6B35" : "#BCA99B"}
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>Menu</Text>
          <Text style={styles.subtitle}>Keep your dishes clear, compact, and easy to manage.</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items"
            placeholderTextColor="#98A2B3"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.addButton} onPress={() => openEditor()}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{menuItems.length === 0 ? "No menu items yet" : "No matching items"}</Text>
          <Text style={styles.emptySubtext}>
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

      {filteredItems.length > 0 ? (
        <TouchableOpacity style={[styles.floatingAddButton, { bottom: insets.bottom + 16 }]} onPress={() => openEditor()}>
          <Text style={styles.floatingAddButtonText}>Add Menu Item</Text>
        </TouchableOpacity>
      ) : null}

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => !saving && setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</Text>

              <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={saving}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>Add Image</Text>
                    <Text style={styles.imagePlaceholderSubtext}>Tap to select from gallery</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Item name"
                placeholderTextColor="#98A2B3"
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
                editable={!saving}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                placeholderTextColor="#98A2B3"
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                multiline
                numberOfLines={3}
                editable={!saving}
              />
              <TextInput
                style={styles.input}
                placeholder="Price"
                placeholderTextColor="#98A2B3"
                value={form.price}
                onChangeText={(text) => setForm({ ...form, price: text.replace(/[^0-9.]/g, "") })}
                keyboardType="decimal-pad"
                editable={!saving}
              />

              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.categoryWrap}>
                {CATEGORIES.map((category) => {
                  const selected = form.category === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                      onPress={() => setForm({ ...form, category })}
                      disabled={saving}
                    >
                      <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{category}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Preparation time in minutes"
                placeholderTextColor="#98A2B3"
                value={form.preparationTime}
                onChangeText={(text) => setForm({ ...form, preparationTime: text.replace(/\D/g, "") })}
                keyboardType="number-pad"
                editable={!saving}
              />

              <View style={styles.formSwitchRow}>
                <Text style={styles.formSwitchLabel}>Vegetarian</Text>
                <Switch value={form.isVegetarian} onValueChange={(value) => setForm({ ...form, isVegetarian: value })} disabled={saving} />
              </View>
              <View style={styles.formSwitchRow}>
                <Text style={styles.formSwitchLabel}>Available for order</Text>
                <Switch value={form.isAvailable} onValueChange={(value) => setForm({ ...form, isAvailable: value })} disabled={saving} />
              </View>

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
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveButtonText}>{editingItem ? "Update" : "Save"}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
    marginTop: 12,
    color: "#6B5E55",
    fontSize: 15
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2C2018"
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#7B6D63"
  },
  addButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: "#1A120B",
    marginRight: 10
  },
  menuItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 10,
    marginBottom: 10
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginRight: 10
  },
  placeholderImage: {
    backgroundColor: "#FFE4D7",
    justifyContent: "center",
    alignItems: "center"
  },
  placeholderText: {
    fontSize: 11,
    color: "#8B6A54"
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
    color: "#2C2018"
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF6B35"
  },
  itemDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: "#6B5E55",
    marginTop: 3
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8
  },
  badge: {
    backgroundColor: "#F8EFE7",
    color: "#7A5640",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    marginRight: 6,
    marginBottom: 4
  },
  vegBadge: {
    backgroundColor: "#E8F5E9",
    color: "#216E39",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden"
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
  availabilityPill: {
    overflow: "hidden",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8
  },
  availablePill: {
    backgroundColor: "#E8F5E9",
    color: "#216E39"
  },
  unavailablePill: {
    backgroundColor: "#FDECEC",
    color: "#B42318"
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
    color: "#C4541C",
    marginRight: 10
  },
  deleteText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B42318"
  },
  floatingAddButton: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#FF6B35",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 15,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8
  },
  floatingAddButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
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
    color: "#2C2018",
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7B6D63",
    textAlign: "center",
    marginBottom: 18
  },
  emptyButton: {
    backgroundColor: "#FF6B35",
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
    backgroundColor: "rgba(0,0,0,0.35)"
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EFE5DA"
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 16,
    textAlign: "center"
  },
  imagePicker: {
    alignItems: "center",
    marginBottom: 16
  },
  selectedImage: {
    width: 132,
    height: 132,
    borderRadius: 22
  },
  imagePlaceholder: {
    width: 132,
    height: 132,
    borderRadius: 22,
    backgroundColor: "#FFF6EF",
    borderWidth: 1,
    borderColor: "#F3DED0",
    justifyContent: "center",
    alignItems: "center"
  },
  imagePlaceholderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#C4541C"
  },
  imagePlaceholderSubtext: {
    fontSize: 12,
    color: "#8B6A54",
    marginTop: 5
  },
  input: {
    borderWidth: 1,
    borderColor: "#D9D0C5",
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1A120B",
    backgroundColor: "#FFFCF8",
    marginBottom: 12
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top"
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B5E55",
    marginBottom: 8
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#F8EFE7",
    marginRight: 8,
    marginBottom: 8
  },
  categoryChipSelected: {
    backgroundColor: "#FF6B35"
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7A5640"
  },
  categoryChipTextSelected: {
    color: "#FFFFFF"
  },
  formSwitchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8
  },
  formSwitchLabel: {
    fontSize: 14,
    color: "#2C2018",
    fontWeight: "700"
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 12
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F5EDE6",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 15,
    marginRight: 8
  },
  cancelButtonText: {
    color: "#7B6D63",
    fontSize: 14,
    fontWeight: "800"
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 15,
    marginLeft: 8
  },
  saveButtonDisabled: {
    backgroundColor: "#FFB08F"
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  }
});
