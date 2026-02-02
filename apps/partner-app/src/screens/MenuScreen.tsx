import React, { useState, useEffect } from "react";
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

// Define API response type
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  [key: string]: any;
}

// Define upload response type
interface UploadResponse {
  success: boolean;
  data: {
    url: string;
    publicId: string;
    format: string;
    size: number;
  };
  message: string;
}

// Category options for dropdown
const CATEGORIES = [
  "Restaurant",
  "Bakery", 
  "Tiffins",
  "Fast Food",
  "Unique Foods",
  "Other"
];

export default function MenuScreen({ navigation }: any) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
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

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      console.log("📋 Loading menu items...");
      
      const response = await api.get("/partners/menu");
      console.log("✅ Menu response:", response.data);
      
      const responseData = response.data as ApiResponse<MenuItem[]>;
      
      if (responseData.success) {
        setMenuItems(responseData.data || []);
        console.log(`✅ Loaded ${responseData.data?.length || 0} menu items`);
      } else {
        console.error("Failed to load menu:", responseData.message);
        Alert.alert("Error", responseData.message || "Failed to load menu items");
      }
    } catch (error: any) {
      console.error("❌ Failed to load menu:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = "Failed to load menu items";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle image upload
  const uploadImageToCloudinary = async (imageUri: string): Promise<string> => {
    try {
      console.log("📤 Uploading image to Cloudinary...");
      
      // Convert image to FormData
      const formData = new FormData();
      
      // Get file name and type
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // @ts-ignore - React Native FormData type issue
      formData.append('image', {
        uri: imageUri,
        type: type,
        name: filename
      });

      // Upload to your backend
      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadData = response.data as UploadResponse;
      
      if (uploadData.success) {
        console.log("✅ Image uploaded:", uploadData.data.url);
        return uploadData.data.url; // Cloudinary URL
      } else {
        throw new Error(uploadData.message || "Upload failed");
      }
      
    } catch (error) {
      console.error("❌ Image upload failed:", error);
      throw error;
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission needed", "Please grant camera roll permissions to add images");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
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

    if (!form.category) {
      Alert.alert("Error", "Please select a category");
      return;
    }

    try {
      setSaving(true);
      
      let imageUrl = editingItem?.imageUrl || "";
      
      // Upload new image if selected and not already a Cloudinary URL
      if (imageUri && imageUri !== editingItem?.imageUrl) {
        // Check if it's already a Cloudinary URL
        if (!imageUri.startsWith('https://res.cloudinary.com')) {
          imageUrl = await uploadImageToCloudinary(imageUri);
        } else {
          imageUrl = imageUri; // Already a Cloudinary URL
        }
      }

      // Prepare data
      const menuData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        category: form.category,
        isVegetarian: form.isVegetarian,
        preparationTime: parseInt(form.preparationTime) || 15,
        isAvailable: form.isAvailable,
        imageUrl: imageUrl
      };

      let response;
      if (editingItem) {
        // Update item
        console.log("Updating menu item:", editingItem._id);
        response = await api.put(`/partners/menu/${editingItem._id}`, menuData);
        console.log("Update response:", response.data);
        Alert.alert("Success", "Menu item updated successfully");
      } else {
        // Add new item
        console.log("Adding new menu item:", menuData);
        response = await api.post("/partners/menu", menuData);
        console.log("Add response:", response.data);
        Alert.alert("Success", "Menu item added successfully");
        
        // If this was the first item, mark setup as complete
        if (menuItems.length === 0) {
          try {
            await api.post("/partners/complete-setup");
            console.log("✅ Setup marked as complete");
          } catch (setupError) {
            console.error("Failed to mark setup complete:", setupError);
          }
        }
      }
      
      setModalVisible(false);
      resetForm();
      loadMenuItems(); // Reload the list
      
    } catch (error: any) {
      console.error("❌ Save error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = "Failed to save menu item";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join(", ");
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      console.log("Toggling availability for:", item._id);
      await api.patch(`/partners/menu/${item._id}/availability`, {
        isAvailable: !item.isAvailable
      });
      loadMenuItems();
    } catch (error: any) {
      console.error("Toggle error:", error);
      Alert.alert("Error", "Failed to update availability");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this menu item?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              console.log("Deleting menu item:", id);
              await api.delete(`/partners/menu/${id}`);
              Alert.alert("Success", "Menu item deleted");
              loadMenuItems();
            } catch (error: any) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Failed to delete item");
            }
          }
        }
      ]
    );
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
    setShowCategoryDropdown(false);
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
          <Text style={styles.itemName}>{item.name}</Text>
          {item.isVegetarian && (
            <Text style={styles.vegBadge}>🟢 Veg</Text>
          )}
        </View>
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description || "No description"}
        </Text>
        <View style={styles.itemDetails}>
          <Text style={styles.itemPrice}>₹{item.price}</Text>
          {item.preparationTime && (
            <Text style={styles.preparationTime}>
              ⏱️ {item.preparationTime} min
            </Text>
          )}
        </View>
        <Text style={styles.itemCategory}>{item.category || "Other"}</Text>
      </View>
      
      <View style={styles.itemActions}>
        <View style={styles.availabilityContainer}>
          <Text style={[
            styles.availabilityText,
            { color: item.isAvailable ? "#4CAF50" : "#F44336" }
          ]}>
            {item.isAvailable ? "Available" : "Unavailable"}
          </Text>
          <Switch
            value={item.isAvailable}
            onValueChange={() => toggleAvailability(item)}
            trackColor={{ false: "#767577", true: "#81C784" }}
            thumbColor={item.isAvailable ? "#4CAF50" : "#F44336"}
          />
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setEditingItem(item);
              setForm({
                name: item.name,
                description: item.description,
                price: item.price.toString(),
                category: item.category,
                isVegetarian: item.isVegetarian || true,
                preparationTime: item.preparationTime?.toString() || "15",
                isAvailable: item.isAvailable
              });
              setImageUri(item.imageUrl || null);
              setModalVisible(true);
            }}
          >
            <Text style={styles.editButton}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDelete(item._id)}
          >
            <Text style={styles.deleteButton}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && menuItems.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Menu Items ({menuItems.length})
        </Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      {menuItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyText}>No menu items yet</Text>
          <Text style={styles.emptySubtext}>
            Add your first item to start receiving orders
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.emptyButtonText}>Add First Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={menuItems}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={loadMenuItems}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => !saving && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingItem ? "Edit Menu Item" : "Add Menu Item"}
              </Text>
              
              {/* Image Picker */}
              <TouchableOpacity 
                style={styles.imagePicker}
                onPress={pickImage}
                disabled={saving}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>+ Add Image</Text>
                    <Text style={styles.imagePlaceholderSubtext}>Tap to select</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TextInput
                style={styles.input}
                placeholder="Item Name *"
                value={form.name}
                onChangeText={text => setForm({...form, name: text})}
                editable={!saving}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                value={form.description}
                onChangeText={text => setForm({...form, description: text})}
                multiline
                numberOfLines={3}
                editable={!saving}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Price (₹) *"
                value={form.price}
                onChangeText={text => setForm({...form, price: text.replace(/[^0-9.]/g, '')})}
                keyboardType="decimal-pad"
                editable={!saving}
              />
              
              {/* Category Selector */}
              <View style={styles.categoryContainer}>
                <Text style={styles.categoryLabel}>Category *</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  disabled={saving}
                >
                  <Text style={styles.categorySelectorText}>
                    {form.category}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                
                {showCategoryDropdown && (
                  <View style={styles.categoryDropdown}>
                    {CATEGORIES.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={styles.categoryOption}
                        onPress={() => {
                          setForm({...form, category});
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <Text style={styles.categoryOptionText}>{category}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Preparation Time (minutes)"
                value={form.preparationTime}
                onChangeText={text => setForm({...form, preparationTime: text.replace(/\D/g, '')})}
                keyboardType="number-pad"
                editable={!saving}
              />
              
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Vegetarian</Text>
                <Switch
                  value={form.isVegetarian}
                  onValueChange={value => setForm({...form, isVegetarian: value})}
                  disabled={saving}
                />
              </View>
              
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Available for Order</Text>
                <Switch
                  value={form.isAvailable}
                  onValueChange={value => setForm({...form, isAvailable: value})}
                  disabled={saving}
                />
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
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
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingItem ? "Update" : "Save"}
                    </Text>
                  )}
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
    backgroundColor: "#f5f5f5"
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333"
  },
  addButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    elevation: 2
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14
  },
  list: {
    padding: 15
  },
  menuItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12
  },
  placeholderImage: {
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center"
  },
  placeholderText: {
    color: "#888",
    fontSize: 11
  },
  itemInfo: {
    flex: 1,
    justifyContent: "space-between"
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1
  },
  vegBadge: {
    fontSize: 11,
    color: "#4CAF50",
    marginLeft: 5,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10
  },
  itemDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6
  },
  itemDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
    marginRight: 10
  },
  preparationTime: {
    fontSize: 12,
    color: "#666"
  },
  itemCategory: {
    fontSize: 11,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  itemActions: {
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginLeft: 10
  },
  availabilityContainer: {
    alignItems: "center",
    marginBottom: 8
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: "500",
    marginBottom: 4
  },
  actionButtons: {
    flexDirection: "row"
  },
  actionButton: {
    marginLeft: 8
  },
  editButton: {
    color: "#2196F3",
    fontSize: 12,
    fontWeight: "500",
    padding: 4
  },
  deleteButton: {
    color: "#F44336",
    fontSize: 12,
    fontWeight: "500",
    padding: 4
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "600",
    marginBottom: 10
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20
  },
  emptyButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 6,
    elevation: 2
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center"
  },
  modalScrollView: {
    flex: 1
  },
  modalScrollContent: {
    padding: 20,
    justifyContent: "center"
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333"
  },
  imagePicker: {
    alignItems: "center",
    marginBottom: 20
  },
  selectedImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#2196F3"
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ccc",
    borderStyle: "dashed"
  },
  imagePlaceholderText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500"
  },
  imagePlaceholderSubtext: {
    color: "#999",
    fontSize: 12,
    marginTop: 5
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#fafafa"
  },
  textArea: {
    height: 80,
    textAlignVertical: "top"
  },
  categoryContainer: {
    marginBottom: 12,
    position: "relative"
  },
  categoryLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
    fontWeight: "500"
  },
  categorySelector: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fafafa",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  categorySelectorText: {
    fontSize: 16,
    color: "#333"
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#666"
  },
  categoryDropdown: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  categoryOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  categoryOptionText: {
    fontSize: 16,
    color: "#333"
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingVertical: 5
  },
  switchLabel: {
    fontSize: 16,
    color: "#333"
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    marginRight: 10
  },
  saveButton: {
    backgroundColor: "#2196F3",
    marginLeft: 10
  },
  saveButtonDisabled: {
    backgroundColor: "#90CAF9",
    opacity: 0.7
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  }
});