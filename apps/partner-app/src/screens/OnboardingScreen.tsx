import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  Alert, 
  ScrollView, 
  StyleSheet,
  TouchableOpacity 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

const CATEGORIES = [
  "bakery",
  "mini-restaurant", 
  "tiffin-center",
  "fast-food",
  "cafe",
  "dessert-parlor",
  "other"
];

export default function OnboardingScreen({ navigation }: any) {
  const [form, setForm] = useState({
    ownerName: "",
    restaurantName: "",
    phone: "",
    address: "",
    googleMapsLink: "",
    category: ""
  });

  const [selectedCategory, setSelectedCategory] = useState("");

  // In OnboardingScreen.tsx - Update the submit function:
const submit = async () => {
  // Validation
  if (!form.ownerName || !form.restaurantName || !form.phone || !form.address || !selectedCategory) {
    Alert.alert("Error", "Please fill all required fields");
    return;
  }

  if (form.phone.length !== 10) {
    Alert.alert("Error", "Enter valid 10-digit phone number");
    return;
  }

  try {
    const storedPhone = await AsyncStorage.getItem("phone");
    let userId = await AsyncStorage.getItem("userId"); // Get logged in user ID
    
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
    
    // Log what we're sending
    const requestData = {
      ...form,
      category: selectedCategory,
      userId: userId || "", // Send empty string if no userId
      documents: {
        fssaiUrl: "", // Will upload later
        shopLicenseUrl: "", // Will upload later
        idProofUrl: "" // Will upload later
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
      <TextInput
        placeholder="10-digit mobile number"
        value={form.phone}
        onChangeText={v => setForm({ ...form, phone: v })}
        keyboardType="number-pad"
        maxLength={10}
        style={styles.input}
      />

      <Text style={styles.label}>Shop Address *</Text>
      <TextInput
        placeholder="Full address with landmark"
        value={form.address}
        onChangeText={v => setForm({ ...form, address: v })}
        multiline
        style={[styles.input, { height: 80 }]}
      />

      <Text style={styles.label}>Google Maps Link (Optional)</Text>
      <TextInput
        placeholder="Paste Google Maps share link"
        value={form.googleMapsLink}
        onChangeText={v => setForm({ ...form, googleMapsLink: v })}
        style={styles.input}
      />

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
              {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
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
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9"
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
    textAlign: "center"
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