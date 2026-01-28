// apps/partner-app/src/screens/MenuScreen.tsx
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
  ActivityIndicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  preparationTime?: number; // in minutes
}

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    isVegetarian: true,
    preparationTime: "",
    isAvailable: true
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
  try {
    setLoading(true);
    const res = await api.get("/partners/menu");
    const responseData = res.data as { success: boolean; data: MenuItem[] };
    
    if (responseData.success) {
      setMenuItems(responseData.data || []);
    } else {
      Alert.alert("Error", "Failed to load menu items");
    }
  } catch (error) {
    console.error("Failed to load menu:", error);
    Alert.alert("Error", "Failed to load menu items");
  } finally {
    setLoading(false);
  }
};

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
        
        // Here you would upload to your server and get URL
        // const uploadedUrl = await uploadImage(result.assets[0].uri);
        // setForm({...form, imageUrl: uploadedUrl});
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      Alert.alert("Error", "Name and price are required");
      return;
    }

    try {
      setLoading(true);
      
      // Prepare data
      const menuData = {
        ...form,
        price: parseFloat(form.price),
        preparationTime: form.preparationTime ? parseInt(form.preparationTime) : 15,
        imageUrl: imageUri || editingItem?.imageUrl
      };

      if (editingItem) {
        // Update item
        await api.put(`/partners/menu/${editingItem._id}`, menuData);
        Alert.alert("Success", "Menu item updated");
      } else {
        // Add new item
        await api.post("/partners/menu", menuData);
        Alert.alert("Success", "Menu item added");
      }
      
      setModalVisible(false);
      resetForm();
      loadMenuItems();
    } catch (error) {
      Alert.alert("Error", "Failed to save menu item");
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      await api.put(`/partners/menu/${item._id}/availability`, {
        isAvailable: !item.isAvailable
      });
      loadMenuItems();
    } catch (error) {
      Alert.alert("Error", "Failed to update availability");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item?",
      [
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
      ]
    );
  };

  const resetForm = () => {
    setEditingItem(null);
    setForm({
      name: "",
      description: "",
      price: "",
      category: "",
      isVegetarian: true,
      preparationTime: "",
      isAvailable: true
    });
    setImageUri(null);
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
        <Text style={styles.itemDescription}>{item.description}</Text>
        <View style={styles.itemDetails}>
          <Text style={styles.itemPrice}>₹{item.price}</Text>
          {item.preparationTime && (
            <Text style={styles.preparationTime}>
              ⏱️ {item.preparationTime} min
            </Text>
          )}
        </View>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>
      
      <View style={styles.itemActions}>
        <View style={styles.availabilityContainer}>
          <Text style={styles.availabilityText}>
            {item.isAvailable ? "Available" : "Unavailable"}
          </Text>
          <Switch
            value={item.isAvailable}
            onValueChange={() => toggleAvailability(item)}
            trackColor={{ false: "#767577", true: "#4CAF50" }}
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
                preparationTime: item.preparationTime?.toString() || "",
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

      {loading && !modalVisible ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : menuItems.length === 0 ? (
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
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingItem ? "Edit Menu Item" : "Add Menu Item"}
            </Text>
            
            {/* Image Picker */}
            <TouchableOpacity 
              style={styles.imagePicker}
              onPress={pickImage}
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
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={form.description}
              onChangeText={text => setForm({...form, description: text})}
              multiline
              numberOfLines={3}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Price (₹) *"
              value={form.price}
              onChangeText={text => setForm({...form, price: text.replace(/[^0-9.]/g, '')})}
              keyboardType="decimal-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Category (e.g., Starters, Main Course)"
              value={form.category}
              onChangeText={text => setForm({...form, category: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Preparation Time (minutes)"
              value={form.preparationTime}
              onChangeText={text => setForm({...form, preparationTime: text.replace(/\D/g, '')})}
              keyboardType="number-pad"
            />
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Vegetarian</Text>
              <Switch
                value={form.isVegetarian}
                onValueChange={value => setForm({...form, isVegetarian: value})}
              />
            </View>
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Available for Order</Text>
              <Switch
                value={form.isAvailable}
                onValueChange={value => setForm({...form, isAvailable: value})}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingItem ? "Update" : "Save"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    elevation: 2
  },
  title: {
    fontSize: 20,
    fontWeight: "bold"
  },
  addButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  list: {
    padding: 15
  },
  menuItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
    elevation: 2
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10
  },
  placeholderImage: {
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center"
  },
  placeholderText: {
    color: "#888",
    fontSize: 12
  },
  itemInfo: {
    flex: 1
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1
  },
  vegBadge: {
    fontSize: 12,
    color: "#4CAF50",
    marginLeft: 5
  },
  itemDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5
  },
  itemDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5
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
    color: "#888",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start'
  },
  itemActions: {
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  availabilityContainer: {
    alignItems: "center"
  },
  availabilityText: {
    fontSize: 10,
    color: "#666",
    marginBottom: 3
  },
  actionButtons: {
    flexDirection: "row"
  },
  actionButton: {
    marginLeft: 5
  },
  editButton: {
    color: "#2196F3",
    fontSize: 12,
    padding: 5
  },
  deleteButton: {
    color: "#F44336",
    fontSize: 12,
    padding: 5
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
    marginBottom: 10
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 20
  },
  emptyButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "bold"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    maxHeight: "90%"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  imagePicker: {
    alignItems: "center",
    marginBottom: 15
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 8
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed"
  },
  imagePlaceholderText: {
    color: "#666",
    fontSize: 14
  },
  imagePlaceholderSubtext: {
    color: "#999",
    fontSize: 10,
    marginTop: 5
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
    fontSize: 16
  },
  textArea: {
    height: 80,
    textAlignVertical: "top"
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  switchLabel: {
    fontSize: 16
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: "center"
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    marginRight: 10
  },
  saveButton: {
    backgroundColor: "#2196F3",
    marginLeft: 10
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold"
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold"
  }
});