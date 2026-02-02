import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Switch
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import api from "../api/client";

interface PartnerProfile {
  _id: string;
  ownerName: string;
  restaurantName: string;
  shopName?: string;
  category: string;
  shopImageUrl?: string;
  phone: string;
  address: {
    state: string;
    city: string;
    pincode: string;
    area: string;
    colony: string;
    roadStreet: string;
    nearbyPlaces: string[];
    googleMapsLink: string;
  };
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  rating: number;
  status: string;
  menuItemsCount: number;
  hasCompletedSetup: boolean;
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

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    openingTime: "08:00",
    closingTime: "22:00",
    isOpen: true
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      console.log("📋 Loading partner profile...");
      
      const response = await api.get("/partners/profile");
      const responseData = response.data as ApiResponse<PartnerProfile>;
      
      if (responseData.success && responseData.data) {
        const profileData = responseData.data;
        setProfile(profileData);
        setForm({
          openingTime: profileData.openingTime || "08:00",
          closingTime: profileData.closingTime || "22:00",
          isOpen: profileData.isOpen !== false
        });
        setImageUri(profileData.shopImageUrl || null);
        
        console.log("✅ Profile loaded:", profileData.restaurantName);
      } else {
        throw new Error(responseData.message || "Failed to load profile");
      }
    } catch (error: any) {
      console.error("❌ Failed to load profile:", error);
      Alert.alert("Error", error.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission needed", "Please grant camera roll permissions");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
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

  const uploadImageToCloudinary = async (imageUri: string): Promise<string> => {
    try {
      console.log("📤 Uploading shop image to Cloudinary...");
      
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'shop.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // @ts-ignore - React Native FormData type issue
      formData.append('image', {
        uri: imageUri,
        type: type,
        name: filename
      });

      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadData = response.data as UploadResponse;
      
      if (uploadData.success) {
        console.log("✅ Shop image uploaded:", uploadData.data.url);
        return uploadData.data.url;
      } else {
        throw new Error(uploadData.message || "Upload failed");
      }
      
    } catch (error) {
      console.error("❌ Shop image upload failed:", error);
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      let shopImageUrl = profile?.shopImageUrl || "";
      
      // Upload new image if selected and different from current
      if (imageUri && imageUri !== profile?.shopImageUrl) {
        // Check if it's already a Cloudinary URL
        if (!imageUri.startsWith('https://res.cloudinary.com')) {
          shopImageUrl = await uploadImageToCloudinary(imageUri);
        } else {
          shopImageUrl = imageUri;
        }
      }

      // Prepare update data - DO NOT include restaurantName
      const updateData: any = {
        shopImageUrl: shopImageUrl
      };

      // Only allow changing timings and open status
      updateData.openingTime = form.openingTime;
      updateData.closingTime = form.closingTime;
      updateData.isOpen = form.isOpen;

      console.log("Updating profile with:", updateData);
      
      const response = await api.put("/partners/profile", updateData);
      const responseData = response.data as ApiResponse<PartnerProfile>;
      
      console.log("✅ Profile updated");
      
      // Check if shopImageUrl is in response
      if (responseData.data && responseData.data.shopImageUrl) {
        console.log("🖼️ Shop image URL updated:", responseData.data.shopImageUrl);
      }
      
      Alert.alert("Success", "Profile updated successfully");
      setEditMode(false);
      loadProfile(); // Reload to show updated image
      
    } catch (error: any) {
      console.error("❌ Save error:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const formatAddress = (address: any) => {
    if (!address) return "Address not available";
    
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

  if (loading && !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text>Profile not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setEditMode(!editMode)}
        >
          <Text style={styles.editButtonText}>
            {editMode ? "Cancel" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        {/* Shop Image - Show profile image first, then uploaded image */}
        <TouchableOpacity 
          style={styles.imagePicker}
          onPress={pickImage}
          disabled={!editMode}
        >
          {profile.shopImageUrl ? (
            <Image source={{ uri: profile.shopImageUrl }} style={styles.shopImage} />
          ) : imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.shopImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>
                {editMode ? "+ Add Shop Image" : "No Image"}
              </Text>
              {editMode && (
                <Text style={styles.imagePlaceholderSubtext}>Tap to select</Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Profile Info */}
        <View style={styles.infoSection}>
          {/* Restaurant Name - Always Read Only */}
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>Restaurant Name</Text>
            <Text style={styles.readOnlyValue}>{profile.restaurantName}</Text>
            <Text style={styles.noteText}>Note: Restaurant name cannot be changed after registration</Text>
          </View>

          <Text style={styles.shopCategory}>{profile.category}</Text>
          
          {editMode ? (
            <>
              <View style={styles.timeContainer}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="Opening Time (HH:MM)"
                  value={form.openingTime}
                  onChangeText={text => setForm({...form, openingTime: text})}
                  editable={!saving}
                />
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="Closing Time (HH:MM)"
                  value={form.closingTime}
                  onChangeText={text => setForm({...form, closingTime: text})}
                  editable={!saving}
                />
              </View>
              
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Shop Open</Text>
                <Switch
                  value={form.isOpen}
                  onValueChange={value => setForm({...form, isOpen: value})}
                  disabled={saving}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, profile.isOpen ? styles.openBadge : styles.closedBadge]}>
                  <Text style={styles.statusText}>
                    {profile.isOpen ? 'Open Now' : 'Closed'}
                  </Text>
                </View>
                <Text style={styles.timing}>
                  {profile.openingTime} - {profile.closingTime}
                </Text>
              </View>
              
              <Text style={styles.rating}>⭐ {profile.rating?.toFixed(1) || '0.0'}</Text>
            </>
          )}

          {/* Static Info (not editable) */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Owner:</Text>
            <Text style={styles.infoValue}>{profile.ownerName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{profile.phone}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{formatAddress(profile.address)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={[
              styles.statusBadge, 
              profile.status === "APPROVED" ? styles.approvedBadge :
              profile.status === "PENDING" ? styles.pendingBadge :
              styles.rejectedBadge
            ]}>
              <Text style={styles.statusText}>{profile.status}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Menu Items:</Text>
            <Text style={styles.infoValue}>{profile.menuItemsCount || 0}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Setup Complete:</Text>
            <Text style={[
              styles.infoValue,
              profile.hasCompletedSetup ? styles.successText : styles.warningText
            ]}>
              {profile.hasCompletedSetup ? "Yes" : "No"}
            </Text>
          </View>
        </View>

        {/* Save Button */}
        {editMode && (
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate("Menu")}
        >
          <Text style={styles.actionButtonText}>📋 Manage Menu ({profile.menuItemsCount})</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate("Orders")}
        >
          <Text style={styles.actionButtonText}>📦 View Orders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            Alert.alert("Coming Soon", "Dashboard features coming soon!");
          }}
        >
          <Text style={styles.actionButtonText}>📊 View Statistics</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  editButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 14,
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imagePicker: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shopImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#2196F3',
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ccc',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  imagePlaceholderSubtext: {
    color: '#999',
    fontSize: 12,
    marginTop: 5,
  },
  infoSection: {
    marginBottom: 20,
  },
  readOnlyField: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  readOnlyLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  readOnlyValue: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  noteText: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic',
  },
  shopName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  shopCategory: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 10,
  },
  openBadge: {
    backgroundColor: '#4CAF50',
  },
  closedBadge: {
    backgroundColor: '#F44336',
  },
  approvedBadge: {
    backgroundColor: '#4CAF50',
  },
  pendingBadge: {
    backgroundColor: '#FF9800',
  },
  rejectedBadge: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timing: {
    fontSize: 14,
    color: '#666',
  },
  rating: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  successText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  warningText: {
    color: '#FF9800',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#90CAF9',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionsSection: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});