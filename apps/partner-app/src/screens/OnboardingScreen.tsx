import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Alert, 
  ScrollView, 
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

// UPDATE: Add sweets and ice creams to categories
const CATEGORIES = [
  "bakery",
  "mini-restaurant", 
  "tiffin-center",
  "fast-food",
  "sweets",       // ADDED
  "ice-creams",   // ADDED
  "other"
];

// Common Indian cities for autocomplete
const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata",
  "Surat", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane",
  "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara", "Ghaziabad",
  "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli",
  "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar",
  "Navi Mumbai", "Allahabad", "Howrah", "Gwalior", "Jabalpur", "Coimbatore",
  "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Chandigarh", "Guwahati"
];

export default function OnboardingScreen({ navigation }: any) {
  const [form, setForm] = useState({
    ownerName: "",
    restaurantName: "",
    phone: "",
  });

  const [address, setAddress] = useState({
    state: "",
    city: "",
    pincode: "",
    area: "",
    colony: "",
    roadStreet: "",
    nearbyPlaces: "",
    googleMapsLink: ""
  });

  const [selectedCategory, setSelectedCategory] = useState("");
  const [autoFilledPhone, setAutoFilledPhone] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);

  // Auto-fill phone number from login
  useEffect(() => {
    const fetchPhone = async () => {
      try {
        const storedPhone = await AsyncStorage.getItem("phone");
        if (storedPhone) {
          setAutoFilledPhone(storedPhone);
          setForm(prev => ({ ...prev, phone: storedPhone }));
        }
      } catch (error) {
        console.log("Error fetching phone:", error);
      }
    };
    fetchPhone();
  }, []);

  // Filter cities based on input
  useEffect(() => {
    if (address.city && address.city.length > 1) {
      const filtered = INDIAN_CITIES.filter(city =>
        city.toLowerCase().includes(address.city.toLowerCase())
      );
      setFilteredCities(filtered);
      setShowCitySuggestions(filtered.length > 0);
    } else {
      setShowCitySuggestions(false);
    }
  }, [address.city]);

  const validateForm = () => {
    // Basic form validation
    if (!form.ownerName || !form.restaurantName || !form.phone) {
      return "Please fill all required fields";
    }

    if (form.phone.length !== 10) {
      return "Enter valid 10-digit phone number";
    }

    if (!selectedCategory) {
      return "Please select a category";
    }

    // Address validation
    if (!address.state || !address.city || !address.pincode || !address.area || 
        !address.colony || !address.roadStreet || !address.googleMapsLink) {
      return "Please fill all address fields including Google Maps link";
    }

    // Pincode validation
    if (!/^\d{6}$/.test(address.pincode)) {
      return "Pincode must be exactly 6 digits";
    }

    // Google Maps link validation
    if (!address.googleMapsLink.startsWith('https://maps.app.goo.gl/') && 
        !address.googleMapsLink.startsWith('https://goo.gl/maps/') &&
        !address.googleMapsLink.startsWith('https://www.google.com/maps/') &&
        !address.googleMapsLink.startsWith('https://www.google.co.in/maps/')) {
      return "Please provide a valid Google Maps link";
    }

    return null;
  };

  const selectCity = (city: string) => {
    setAddress(prev => ({ ...prev, city }));
    setShowCitySuggestions(false);
  };

  const openGoogleMaps = () => {
    const url = "https://maps.google.com";
    Linking.openURL(url).catch(err => 
      Alert.alert("Error", "Could not open Google Maps")
    );
  };

  const submit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert("Error", validationError);
      return;
    }

    try {
      const storedPhone = await AsyncStorage.getItem("phone");
      let userId = await AsyncStorage.getItem("userId");
      
      console.log("🔍 Debug - storedPhone:", storedPhone);
      console.log("🔍 Debug - userId from storage:", userId);
      
      // If userId is not found, try to get it from user object
      if (!userId || userId === "null" || userId === "undefined") {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user.id;
          console.log("🔍 Got userId from user object:", userId);
        }
      }
      
      // Process nearby places into array
      const nearbyPlacesArray = address.nearbyPlaces
        .split(',')
        .map(place => place.trim())
        .filter(place => place.length > 0);
      
      // Prepare request data
      const requestData = {
        ...form,
        address: {
          state: address.state.trim(),
          city: address.city.trim(),
          pincode: address.pincode.trim(),
          area: address.area.trim(),
          colony: address.colony.trim(),
          roadStreet: address.roadStreet.trim(),
          nearbyPlaces: nearbyPlacesArray,
          googleMapsLink: address.googleMapsLink.trim()
        },
        category: selectedCategory,
        userId: userId || "",
        documents: {
          fssaiUrl: "",
          shopLicenseUrl: "",
          idProofUrl: ""
        }
      };
      
      console.log("📤 Sending request data:", requestData);
      
      const response = await api.post("/partners/onboard", requestData);
      
      console.log("✅ Server response:", response.data);
      
      // Save partner phone for status checking
      await AsyncStorage.setItem("partnerPhone", form.phone);
      
      Alert.alert(
        "Submitted Successfully", 
        "Your profile is under review. You can submit documents later from your profile.",
        [
          { 
            text: "OK", 
            onPress: () => navigation.replace("PendingApproval")
          }
        ]
      );
    } catch (error: any) {
      console.error("❌ Submission error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = "Submission failed. Please try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Partner Registration</Text>
        
        <Text style={styles.label}>Owner Name *</Text>
        <TextInput
          placeholder="Enter full name"
          value={form.ownerName}
          onChangeText={v => setForm({ ...form, ownerName: v })}
          style={styles.input}
        />

        <Text style={styles.label}>Restaurant/Shop Name *</Text>
        <TextInput
          placeholder="Enter restaurant name"
          value={form.restaurantName}
          onChangeText={v => setForm({ ...form, restaurantName: v })}
          style={styles.input}
        />

        <Text style={styles.label}>Phone Number *</Text>
        <View style={styles.phoneContainer}>
          <TextInput
            placeholder="10-digit mobile number"
            value={form.phone}
            onChangeText={v => setForm({ ...form, phone: v })}
            keyboardType="number-pad"
            maxLength={10}
            style={[styles.input, autoFilledPhone && styles.disabledInput]}
            editable={!autoFilledPhone}
          />
          {autoFilledPhone && (
            <Text style={styles.autoFillNote}>
              Auto-filled from login
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Shop Address Details</Text>

        <Text style={styles.label}>State *</Text>
        <TextInput
          placeholder="e.g., Maharashtra, Delhi, Karnataka"
          value={address.state}
          onChangeText={v => setAddress({ ...address, state: v })}
          style={styles.input}
        />

        <Text style={styles.label}>City/Town *</Text>
        <View style={styles.cityContainer}>
          <TextInput
            placeholder="e.g., Mumbai, Delhi, Bangalore"
            value={address.city}
            onChangeText={v => setAddress({ ...address, city: v })}
            style={styles.input}
          />
          {showCitySuggestions && (
            <View style={styles.citySuggestions}>
              <ScrollView style={styles.suggestionsScroll}>
                {filteredCities.map(city => (
                  <TouchableOpacity
                    key={city}
                    style={styles.suggestionItem}
                    onPress={() => selectCity(city)}
                  >
                    <Text style={styles.suggestionText}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <Text style={styles.label}>Pincode *</Text>
        <TextInput
          placeholder="6-digit pincode"
          value={address.pincode}
          onChangeText={v => setAddress({ ...address, pincode: v })}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.input}
        />

        <Text style={styles.label}>Area/Locality *</Text>
        <TextInput
          placeholder="e.g., Andheri West, Connaught Place"
          value={address.area}
          onChangeText={v => setAddress({ ...address, area: v })}
          style={styles.input}
        />

        <Text style={styles.label}>Colony/Society *</Text>
        <TextInput
          placeholder="e.g., XYZ Society, ABC Apartments"
          value={address.colony}
          onChangeText={v => setAddress({ ...address, colony: v })}
          style={styles.input}
        />

        <Text style={styles.label}>Road/Street No. *</Text>
        <TextInput
          placeholder="e.g., Main Road, Street No. 5"
          value={address.roadStreet}
          onChangeText={v => setAddress({ ...address, roadStreet: v })}
          style={styles.input}
        />

        <Text style={styles.label}>Nearby Places (Optional)</Text>
        <TextInput
          placeholder="e.g., Near Metro Station, Opposite Mall (comma separated)"
          value={address.nearbyPlaces}
          onChangeText={v => setAddress({ ...address, nearbyPlaces: v })}
          style={styles.input}
        />

        <Text style={styles.label}>Google Maps Link *</Text>
        <View style={styles.mapsContainer}>
          <TextInput
            placeholder="Paste Google Maps share link"
            value={address.googleMapsLink}
            onChangeText={v => setAddress({ ...address, googleMapsLink: v })}
            style={[styles.input, styles.mapsInput]}
          />
          <TouchableOpacity 
            style={styles.openMapsButton}
            onPress={openGoogleMaps}
          >
            <Text style={styles.openMapsText}>Open Maps</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.helpText}>
          How to get Google Maps link:{'\n'}
          1. Open Google Maps app{'\n'}
          2. Find your shop location{'\n'}
          3. Tap and hold to drop a pin{'\n'}
          4. Tap "Share" → "Copy link"
        </Text>

        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoriesContainer}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                selectedCategory === cat && styles.categoryButtonSelected
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === cat && styles.categoryTextSelected
              ]}>
                {cat.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.note}>
          Note: You can submit legal documents (FSSAI, License, ID Proof) later from your profile after approval.
        </Text>

        <TouchableOpacity style={styles.submitButton} onPress={submit}>
          <Text style={styles.submitButtonText}>Submit for Approval</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 15,
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
    color: "#333"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9"
  },
  disabledInput: {
    backgroundColor: "#e9e9e9",
    color: "#666"
  },
  phoneContainer: {
    marginBottom: 5
  },
  autoFillNote: {
    fontSize: 12,
    color: "#4CAF50",
    marginTop: 4,
    marginLeft: 5
  },
  cityContainer: {
    position: "relative",
    zIndex: 10
  },
  citySuggestions: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    maxHeight: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000
  },
  suggestionsScroll: {
    maxHeight: 150
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  suggestionText: {
    fontSize: 14,
    color: "#333"
  },
  mapsContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  mapsInput: {
    flex: 1,
    marginRight: 10
  },
  openMapsButton: {
    backgroundColor: "#4285F4",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center"
  },
  openMapsText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14
  },
  helpText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
    marginBottom: 15,
    lineHeight: 18
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 10
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5"
  },
  categoryButtonSelected: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50"
  },
  categoryText: {
    fontSize: 14,
    color: "#333"
  },
  categoryTextSelected: {
    color: "#fff",
    fontWeight: "600"
  },
  note: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginTop: 20,
    marginBottom: 20,
    textAlign: "center",
    padding: 10,
    backgroundColor: "#f0f8ff",
    borderRadius: 8
  },
  submitButton: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold"
  }
});