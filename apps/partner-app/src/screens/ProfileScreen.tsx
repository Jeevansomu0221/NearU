import React, { useEffect, useState } from "react";
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
  Switch,
  Linking
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

interface UploadResponse {
  success: boolean;
  data: {
    url: string;
  };
  message: string;
}

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editAddressMode, setEditAddressMode] = useState(false);
  const [form, setForm] = useState({
    openingTime: "08:00",
    closingTime: "22:00",
    isOpen: true,
    googleMapsLink: ""
  });
  const [addressForm, setAddressForm] = useState({
    roadStreet: "",
    colony: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    googleMapsLink: ""
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/partners/profile");
      const responseData = response.data as ApiResponse<PartnerProfile>;

      if (responseData.success && responseData.data) {
        const profileData = responseData.data;
        setProfile(profileData);
        setForm({
          openingTime: profileData.openingTime || "08:00",
          closingTime: profileData.closingTime || "22:00",
          isOpen: profileData.isOpen !== false,
          googleMapsLink: profileData.address?.googleMapsLink || ""
        });
        setAddressForm({
          roadStreet: profileData.address?.roadStreet || "",
          colony: profileData.address?.colony || "",
          area: profileData.address?.area || "",
          city: profileData.address?.city || "",
          state: profileData.address?.state || "",
          pincode: profileData.address?.pincode || "",
          googleMapsLink: profileData.address?.googleMapsLink || ""
        });
        setImageUri(profileData.shopImageUrl || null);
      } else {
        throw new Error(responseData.message || "Failed to load profile");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant gallery permission");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (!result.canceled && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImageToCloudinary = async (selectedImageUri: string): Promise<string> => {
    const formData = new FormData();
    const filename = selectedImageUri.split("/").pop() || "shop.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    // @ts-ignore React Native FormData file object
    formData.append("image", {
      uri: selectedImageUri,
      type,
      name: filename
    });

    const response = await api.post("/upload/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    const uploadData = response.data as UploadResponse;
    if (!uploadData.success) {
      throw new Error(uploadData.message || "Upload failed");
    }
    return uploadData.data.url;
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      let shopImageUrl = profile?.shopImageUrl || "";

      if (imageUri && imageUri !== profile?.shopImageUrl) {
        shopImageUrl = imageUri.startsWith("https://res.cloudinary.com") ? imageUri : await uploadImageToCloudinary(imageUri);
      }

      const updateData: any = {
        shopImageUrl,
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        isOpen: form.isOpen
      };

      if (editAddressMode) {
        updateData.address = {
          ...profile?.address,
          googleMapsLink: form.googleMapsLink,
          ...(addressForm.roadStreet && { roadStreet: addressForm.roadStreet }),
          ...(addressForm.colony && { colony: addressForm.colony }),
          ...(addressForm.area && { area: addressForm.area }),
          ...(addressForm.city && { city: addressForm.city }),
          ...(addressForm.state && { state: addressForm.state }),
          ...(addressForm.pincode && { pincode: addressForm.pincode })
        };
      } else {
        updateData.address = {
          ...profile?.address,
          googleMapsLink: form.googleMapsLink
        };
      }

      await api.put("/partners/profile", updateData);
      Alert.alert("Success", "Profile updated successfully");
      setEditMode(false);
      setEditAddressMode(false);
      loadProfile();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const formatAddress = (address: any) => {
    if (!address) return "Address not available";
    if (typeof address === "string") return address;
    return [address.roadStreet, address.colony, address.area, address.city, address.state, address.pincode].filter(Boolean).join(", ");
  };

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Profile not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Shop profile</Text>
        <Text style={styles.heroTitle}>{profile.restaurantName}</Text>
        <Text style={styles.heroSubtitle}>Keep your storefront details clean and accurate for customers and admins.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Business details</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              if (editMode) {
                setEditMode(false);
                setEditAddressMode(false);
                loadProfile();
              } else {
                setEditMode(true);
              }
            }}
          >
            <Text style={styles.editButtonText}>{editMode ? "Cancel" : "Edit"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={!editMode}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.shopImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>{editMode ? "Add Shop Image" : "No Image"}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>Restaurant name</Text>
          <Text style={styles.readOnlyValue}>{profile.restaurantName}</Text>
          <Text style={styles.readOnlyNote}>Restaurant name stays fixed after registration.</Text>
        </View>

        <Text style={styles.categoryChip}>{profile.category}</Text>

        {editMode ? (
          <>
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Opening time</Text>
                <TextInput
                  style={styles.input}
                  value={form.openingTime}
                  onChangeText={(text) => setForm({ ...form, openingTime: text })}
                  editable={!saving}
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Closing time</Text>
                <TextInput
                  style={styles.input}
                  value={form.closingTime}
                  onChangeText={(text) => setForm({ ...form, closingTime: text })}
                  editable={!saving}
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Shop open for orders</Text>
              <Switch value={form.isOpen} onValueChange={(value) => setForm({ ...form, isOpen: value })} disabled={saving} />
            </View>

            <View style={styles.subsectionHeader}>
              <Text style={styles.subsectionTitle}>Address</Text>
              {!editAddressMode ? (
                <TouchableOpacity onPress={() => setEditAddressMode(true)}>
                  <Text style={styles.linkText}>Edit Address</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {editAddressMode ? (
              <>
                <TextInput style={styles.input} placeholder="Road / street" placeholderTextColor="#98A2B3" value={addressForm.roadStreet} onChangeText={(text) => setAddressForm({ ...addressForm, roadStreet: text })} editable={!saving} />
                <TextInput style={styles.input} placeholder="Colony / society" placeholderTextColor="#98A2B3" value={addressForm.colony} onChangeText={(text) => setAddressForm({ ...addressForm, colony: text })} editable={!saving} />
                <TextInput style={styles.input} placeholder="Area / locality" placeholderTextColor="#98A2B3" value={addressForm.area} onChangeText={(text) => setAddressForm({ ...addressForm, area: text })} editable={!saving} />
                <TextInput style={styles.input} placeholder="City" placeholderTextColor="#98A2B3" value={addressForm.city} onChangeText={(text) => setAddressForm({ ...addressForm, city: text })} editable={!saving} />
                <TextInput style={styles.input} placeholder="State" placeholderTextColor="#98A2B3" value={addressForm.state} onChangeText={(text) => setAddressForm({ ...addressForm, state: text })} editable={!saving} />
                <TextInput style={styles.input} placeholder="Pincode" placeholderTextColor="#98A2B3" keyboardType="number-pad" maxLength={6} value={addressForm.pincode} onChangeText={(text) => setAddressForm({ ...addressForm, pincode: text })} editable={!saving} />
              </>
            ) : (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Current address</Text>
                <Text style={styles.detailValue}>{formatAddress(profile.address)}</Text>
              </View>
            )}

            <Text style={styles.label}>Shop Google Maps link</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste shop Google Maps link"
              placeholderTextColor="#98A2B3"
              value={form.googleMapsLink}
              onChangeText={(text) => setForm({ ...form, googleMapsLink: text })}
              editable={!saving}
            />

            <View style={styles.inlineActions}>
              <TouchableOpacity style={styles.utilityButton} onPress={() => Linking.openURL("https://maps.google.com")}>
                <Text style={styles.utilityButtonText}>Open Maps</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.utilityButton}
                onPress={() => {
                  if (form.googleMapsLink) {
                    Linking.openURL(form.googleMapsLink).catch(() => Alert.alert("Error", "Could not open Google Maps link"));
                  }
                }}
              >
                <Text style={styles.utilityButtonText}>Test Link</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSaveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.statusRow}>
              <Text style={[styles.statusBadge, profile.isOpen ? styles.openBadge : styles.closedBadge]}>
                {profile.isOpen ? "Open Now" : "Closed"}
              </Text>
              <Text style={styles.timingText}>{profile.openingTime} - {profile.closingTime}</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Owner</Text>
                <Text style={styles.infoValue}>{profile.ownerName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{profile.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{formatAddress(profile.address)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Approval</Text>
                <Text style={styles.infoValue}>{profile.status}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Menu items</Text>
                <Text style={styles.infoValue}>{profile.menuItemsCount || 0}</Text>
              </View>
            </View>

            {profile.address?.googleMapsLink ? (
              <TouchableOpacity style={styles.mapsLinkButton} onPress={() => Linking.openURL(profile.address.googleMapsLink)}>
                <Text style={styles.mapsLinkText}>Open in Google Maps</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Menu")}>
          <Text style={styles.actionTitle}>Manage Menu</Text>
          <Text style={styles.actionDescription}>Update prices, availability, and dish images.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Orders")}>
          <Text style={styles.actionTitle}>View Orders</Text>
          <Text style={styles.actionDescription}>Open your live orders queue and respond faster.</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    fontSize: 15,
    color: "#6B5E55"
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FF6B35",
    borderRadius: 28,
    padding: 22
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#FFE4D7",
    marginBottom: 8
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#FFF4EE"
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 16
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2C2018"
  },
  editButton: {
    backgroundColor: "#FDE9DE",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  editButtonText: {
    color: "#C4541C",
    fontSize: 13,
    fontWeight: "800"
  },
  imagePicker: {
    alignItems: "center",
    marginBottom: 18
  },
  shopImage: {
    width: 160,
    height: 160,
    borderRadius: 28
  },
  imagePlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 28,
    backgroundColor: "#FFF6EF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3DED0"
  },
  imagePlaceholderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#C4541C"
  },
  readOnlyField: {
    backgroundColor: "#FFFCF8",
    borderWidth: 1,
    borderColor: "#EFE5DA",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12
  },
  readOnlyLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8B6A54",
    marginBottom: 4
  },
  readOnlyValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2C2018"
  },
  readOnlyNote: {
    marginTop: 6,
    fontSize: 12,
    color: "#7B6D63"
  },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: "#F8EFE7",
    color: "#7A5640",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 14
  },
  row: {
    flexDirection: "row"
  },
  half: {
    flex: 1,
    marginRight: 10
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B5E55",
    marginBottom: 8
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2C2018"
  },
  subsectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2C2018"
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C4541C"
  },
  detailBlock: {
    backgroundColor: "#FFF8F1",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8B6A54",
    marginBottom: 5
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
    color: "#2C2018"
  },
  inlineActions: {
    flexDirection: "row",
    marginBottom: 12
  },
  utilityButton: {
    backgroundColor: "#FDE9DE",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8
  },
  utilityButtonText: {
    color: "#C4541C",
    fontSize: 13,
    fontWeight: "700"
  },
  saveButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 16
  },
  saveButtonDisabled: {
    backgroundColor: "#FFB08F"
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14
  },
  statusBadge: {
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
    marginRight: 10
  },
  openBadge: {
    backgroundColor: "#216E39"
  },
  closedBadge: {
    backgroundColor: "#B42318"
  },
  timingText: {
    fontSize: 14,
    color: "#6B5E55"
  },
  infoCard: {
    backgroundColor: "#FFFCF8",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    paddingHorizontal: 14
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2E9E0"
  },
  infoLabel: {
    fontSize: 13,
    color: "#7B6D63",
    marginRight: 12
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#2C2018"
  },
  mapsLinkButton: {
    marginTop: 12,
    backgroundColor: "#FDE9DE",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 13
  },
  mapsLinkText: {
    color: "#C4541C",
    fontSize: 13,
    fontWeight: "800"
  },
  actionCard: {
    backgroundColor: "#FFFCF8",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 14,
    marginBottom: 10
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 4
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5E55"
  }
});
